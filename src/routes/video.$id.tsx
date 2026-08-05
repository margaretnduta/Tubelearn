import { createFileRoute, Link, Navigate, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Trash2, ExternalLink, Scissors, Plus, Play, Sparkles, Loader2, Pencil, X, Send, RotateCcw, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore, formatDuration, relativeTime, type VideoSegment } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { summarizeVideo, clearVideoSummary, askAboutVideo } from "@/lib/summarize.functions";

export const Route = createFileRoute("/video/$id")({
  component: VideoPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Video not found</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-[var(--ember)]">← Back to dashboard</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Couldn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </AppShell>
  ),
});

// --- YT IFrame API loader (singleton) ---
type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (sec: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
};
type YTGlobal = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
};

let ytReadyPromise: Promise<YTGlobal> | null = null;
function loadYT(): Promise<YTGlobal> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const w = window as unknown as { YT?: YTGlobal; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (ytReadyPromise) return ytReadyPromise;
  ytReadyPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT!);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return ytReadyPromise;
}

function VideoPage() {
  const userId = useAuth((s) => s.currentUserId);
  const { id } = Route.useParams();
  const video = useStore((s) => s.videos.find((v) => v.id === id));
  const categories = useStore((s) => s.categories);
  const categoryIdForVideo = video?.categoryId ?? null;
  const otherInCategoryIds = useStore((s) =>
    s.videos
      .filter((v) => v.id !== id && v.categoryId === categoryIdForVideo)
      .map((v) => v.id)
      .join(","),
  );
  const allVideos = useStore((s) => s.videos);
  const otherInCategory = otherInCategoryIds
    ? otherInCategoryIds.split(",").map((vid) => allVideos.find((v) => v.id === vid)!).filter(Boolean)
    : [];
  const updateVideo = useStore((s) => s.updateVideo);
  const toggleComplete = useStore((s) => s.toggleComplete);
  const deleteVideo = useStore((s) => s.deleteVideo);
  const assignCategory = useStore((s) => s.assignCategory);
  const logSession = useStore((s) => s.logSession);
  const bumpStreak = useStore((s) => s.bumpStreak);
  const setVideoDuration = useStore((s) => s.setVideoDuration);
  const setVideoSummary = useStore((s) => s.setVideoSummary);
  const setVideoPosition = useStore((s) => s.setVideoPosition);
  const addSegment = useStore((s) => s.addSegment);
  const updateSegment = useStore((s) => s.updateSegment);
  const deleteSegment = useStore((s) => s.deleteSegment);
  const addSegmentWatchTime = useStore((s) => s.addSegmentWatchTime);

  const [notes, setNotes] = useState(video?.notes ?? "");
  const [activeSeconds, setActiveSeconds] = useState(video?.watchedSeconds ?? 0);
  const [duration, setDuration] = useState<number>(video?.durationSeconds ?? 0);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const isPlayingRef = useRef(false);
  const lastTickRef = useRef<number | null>(null);
  const flushBufferRef = useRef(0);
  const activeSegIdRef = useRef<string | null>(null);
  const resumeAtRef = useRef<number>(video?.lastPositionSeconds ?? 0);
  useEffect(() => { activeSegIdRef.current = activeSegmentId; }, [activeSegmentId]);
  useEffect(() => { resumeAtRef.current = video?.lastPositionSeconds ?? 0; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [video?.id]);

  // Mount the YT player once per video
  useEffect(() => {
    if (!video?.youtubeId || !playerHostRef.current) return;
    let cancelled = false;
    let tickHandle: ReturnType<typeof setInterval> | null = null;
    let flushHandle: ReturnType<typeof setInterval> | null = null;

    bumpStreak(video.id);

    const flushLog = () => {
      const s = Math.round(flushBufferRef.current);
      if (s >= 5) {
        logSession(video.id, s);
        const segId = activeSegIdRef.current;
        if (segId) addSegmentWatchTime(video.id, segId, s);
        flushBufferRef.current = flushBufferRef.current - s;
      }
    };

    const savePosition = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime();
        if (Number.isFinite(t) && t > 0) setVideoPosition(video.id, t);
      } catch { /* ignore */ }
    };

    loadYT().then((YT) => {
      if (cancelled || !playerHostRef.current) return;
      const host = document.createElement("div");
      playerHostRef.current.innerHTML = "";
      playerHostRef.current.appendChild(host);
      const resumeAt = Math.max(0, Math.round(resumeAtRef.current || 0));
      playerRef.current = new YT.Player(host, {
        videoId: video.youtubeId,
        playerVars: { rel: 0, modestbranding: 1, ...(resumeAt > 5 ? { start: resumeAt } : {}) },
        events: {
          onReady: (e) => {
            const d = Math.round(e.target.getDuration() || 0);
            if (d > 0) {
              setDuration(d);
              setVideoDuration(video.id, d);
            }
            // Resume where the learner stopped (skip if effectively finished)
            if (resumeAt > 5 && (!d || resumeAt < d - 10)) {
              try { e.target.seekTo(resumeAt, true); } catch { /* ignore */ }
              setResumedFrom(resumeAt);
            }
          },
          onStateChange: (e) => {
            const playing = e.data === YT.PlayerState.PLAYING;
            isPlayingRef.current = playing;
            if (playing) {
              lastTickRef.current = Date.now();
            } else {
              lastTickRef.current = null;
              savePosition();
            }
          },
        },
      });

      tickHandle = setInterval(() => {
        if (isPlayingRef.current && lastTickRef.current) {
          const now = Date.now();
          const delta = (now - lastTickRef.current) / 1000;
          lastTickRef.current = now;
          flushBufferRef.current += delta;
          setActiveSeconds((prev) => prev + delta);
        }
      }, 1000);
      flushHandle = setInterval(() => { flushLog(); savePosition(); }, 20_000);
    });

    const onHide = () => { flushLog(); savePosition(); };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      cancelled = true;
      flushLog();
      savePosition();
      if (tickHandle) clearInterval(tickHandle);
      if (flushHandle) clearInterval(flushHandle);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.youtubeId, video?.id]);

  // Sync initial active seconds when the video row loads
  useEffect(() => {
    if (video) setActiveSeconds(video.watchedSeconds);
    // only reset when switching videos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id]);

  const playSegment = useCallback((seg: VideoSegment) => {
    const player = playerRef.current;
    if (!player) return;
    setActiveSegmentId(seg.id);
    try {
      player.seekTo(seg.startSec, true);
      player.playVideo();
    } catch { /* ignore */ }
  }, []);

  if (!userId) return <Navigate to="/auth" search={{ mode: "signin", redirect: `/video/${id}` }} />;
  if (!video) throw notFound();

  const category = categories.find((c) => c.id === video.categoryId);

  const effectiveDuration = duration || video.durationSeconds || 0;
  const eligibleForSplit = effectiveDuration >= 3600;
  const maxSegments = Math.max(0, Math.floor(effectiveDuration / 1800));

  const handleSummarize = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await summarizeVideo({ data: { videoRowId: video.id, youtubeId: video.youtubeId } });
      setVideoSummary(video.id, res.summary);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to summarize";
      setSummaryError(msg);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDeleteSummary = async () => {
    if (!confirm("Delete this AI summary?")) return;
    setSummaryError(null);
    const prev = video.summary;
    setVideoSummary(video.id, undefined);
    try {
      await clearVideoSummary({ data: { videoRowId: video.id } });
    } catch (e) {
      setVideoSummary(video.id, prev);
      setSummaryError(e instanceof Error ? e.message : "Failed to delete summary");
    }
  };

  const handleAutoSplit = () => {
    if (!eligibleForSplit || maxSegments < 1) return;
    if (video.segments.length > 0 && !confirm("Replace the existing segments with evenly aligned ones?")) return;
    for (const s of video.segments) deleteSegment(video.id, s.id);
    const n = maxSegments;
    const size = effectiveDuration / n;
    for (let i = 0; i < n; i++) {
      const start = Math.round(i * size);
      const end = i === n - 1 ? effectiveDuration : Math.round((i + 1) * size);
      addSegment(video.id, { name: `Part ${i + 1}`, startSec: start, endSec: end });
    }
    setActiveSegmentId(null);
  };

  const handleRestart = () => {
    setVideoPosition(video.id, 0);
    setResumedFrom(null);
    try {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.playVideo();
    } catch { /* ignore */ }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-xl border border-border bg-black shadow-lift">
              <div className="aspect-video w-full">
                <div ref={playerHostRef} className="h-full w-full" />
              </div>
            </div>

            {resumedFrom !== null && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                <span className="tabular">Resumed where you left off — {fmtHms(resumedFrom)}</span>
                <button onClick={handleRestart} className="inline-flex items-center gap-1 hover:text-foreground">
                  <RotateCcw className="h-3 w-3" /> Start from beginning
                </button>
              </div>
            )}

            <div className="mt-6">
              {category && (
                <Link
                  to="/category/$id"
                  params={{ id: category.id }}
                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                  {category.name}
                </Link>
              )}
              <h1 className="mt-2 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{video.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{video.channel}</span>
                <span className="tabular">Added {relativeTime(video.addedAt)}</span>
                {effectiveDuration > 0 && (
                  <span className="tabular">Runtime {formatDuration(effectiveDuration)}</span>
                )}
                <a
                  href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Open on YouTube <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <SegmentsPanel
              videoId={video.id}
              segments={video.segments}
              duration={effectiveDuration}
              eligible={eligibleForSplit}
              maxSegments={maxSegments}
              activeId={activeSegmentId}
              onPlay={playSegment}
              onAdd={(name, startSec, endSec) => addSegment(video.id, { name, startSec, endSec })}
              onUpdate={(segId, patch) => updateSegment(video.id, segId, patch)}
              onDelete={(segId) => {
                if (activeSegmentId === segId) setActiveSegmentId(null);
                deleteSegment(video.id, segId);
              }}
            />

            <SummaryPanel
              summary={video.summary}
              loading={summaryLoading}
              error={summaryError}
              onRun={handleSummarize}
            />

            <div className="mt-6">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 5000))}
                onBlur={() => updateVideo(video.id, { notes })}
                placeholder="What did you take away? Definitions, questions, things to revisit…"
                rows={6}
                className="w-full resize-y rounded-md border border-input bg-card p-3 text-sm outline-none ring-ring focus:ring-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">Saved when you click away.</p>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active watch time</p>
              <div className="mt-1 font-display text-3xl tracking-tight tabular">{formatDuration(activeSeconds)}</div>
              <p className="text-xs text-muted-foreground">
                counts only while the video is playing
              </p>

              <button
                onClick={() => toggleComplete(video.id)}
                className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                  video.completed
                    ? "bg-[var(--moss)] text-background"
                    : "border border-foreground bg-foreground text-background"
                }`}
              >
                <Check className="h-4 w-4" />
                {video.completed ? "Completed" : "Mark complete"}
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Move to</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => assignCategory(video.id, null)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    !video.categoryId ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Unsorted
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => assignCategory(video.id, c.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                      video.categoryId === c.id ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {otherInCategory.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Up next in {category?.name}
                </p>
                <div className="space-y-3">
                  {otherInCategory.slice(0, 4).map((v) => (
                    <Link
                      key={v.id}
                      to="/video/$id"
                      params={{ id: v.id }}
                      className="group flex gap-3"
                    >
                      <img src={v.thumbnail} alt="" className="h-14 w-24 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm leading-snug group-hover:text-[var(--ember)]">{v.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{v.channel}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (confirm("Remove this video from your library?")) {
                  deleteVideo(video.id);
                  window.history.back();
                }
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove from library
            </button>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

// -------------- Segments Panel --------------

function parseTimeInput(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10) * 60; // minutes shorthand
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
function fmtHms(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rs = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(rs).padStart(2, "0")}`;
  return `${m}:${String(rs).padStart(2, "0")}`;
}

function SegmentsPanel({
  segments,
  duration,
  eligible,
  maxSegments,
  activeId,
  onPlay,
  onAdd,
  onUpdate,
  onDelete,
}: {
  videoId: string;
  segments: VideoSegment[];
  duration: number;
  eligible: boolean;
  maxSegments: number;
  activeId: string | null;
  onPlay: (s: VideoSegment) => void;
  onAdd: (name: string, startSec: number, endSec: number) => void;
  onUpdate: (segId: string, patch: Partial<VideoSegment>) => void;
  onDelete: (segId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-xl tracking-tight">Split into segments</h2>
        </div>
        {eligible && segments.length < maxSegments && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add segment
          </button>
        )}
      </div>

      {!eligible ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Splitting is available for videos at least 1 hour long. {duration > 0 ? `This one is ${formatDuration(duration)}.` : "Video length not detected yet — press play once."}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Each segment is at least 30 minutes. Up to {maxSegments} for this video. Only visible here on the watch page.
        </p>
      )}

      {adding && eligible && (
        <SegmentForm
          duration={duration}
          onCancel={() => setAdding(false)}
          onSubmit={(name, start, end) => {
            onAdd(name, start, end);
            setAdding(false);
          }}
          existing={segments}
        />
      )}

      {segments.length > 0 && (
        <ul className="mt-4 space-y-2">
          {segments.map((s, i) => {
            const segLen = s.endSec - s.startSec;
            const pct = segLen > 0 ? Math.min(100, Math.round((s.watchedSeconds / segLen) * 100)) : 0;
            const isEditing = editingId === s.id;
            if (isEditing) {
              return (
                <li key={s.id} className="rounded-md border border-border bg-background p-3">
                  <SegmentForm
                    duration={duration}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(name, start, end) => {
                      onUpdate(s.id, { name, startSec: start, endSec: end });
                      setEditingId(null);
                    }}
                    existing={segments.filter((x) => x.id !== s.id)}
                    initial={s}
                  />
                </li>
              );
            }
            return (
              <li
                key={s.id}
                className={`rounded-md border p-3 transition-colors ${activeId === s.id ? "border-[var(--ember)] bg-[var(--ember)]/5" : "border-border bg-background"}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onPlay(s)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background hover:opacity-90"
                    aria-label={`Play segment ${i + 1}`}
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name || `Segment ${i + 1}`}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular">
                      {fmtHms(s.startSec)} → {fmtHms(s.endSec)} · {formatDuration(segLen)} · {formatDuration(s.watchedSeconds)} watched
                    </p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-[var(--ember)] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingId(s.id)}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                    aria-label="Edit segment"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this segment?")) onDelete(s.id); }}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                    aria-label="Delete segment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SegmentForm({
  duration,
  onSubmit,
  onCancel,
  existing,
  initial,
}: {
  duration: number;
  onSubmit: (name: string, startSec: number, endSec: number) => void;
  onCancel: () => void;
  existing: VideoSegment[];
  initial?: VideoSegment;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [start, setStart] = useState(initial ? fmtHms(initial.startSec) : "0:00");
  const [end, setEnd] = useState(initial ? fmtHms(initial.endSec) : fmtHms(Math.min(duration, 1800)));
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sSec = parseTimeInput(start);
    const eSec = parseTimeInput(end);
    if (sSec === null || eSec === null) return setErr("Use m:ss or h:mm:ss");
    if (eSec <= sSec) return setErr("End must be after start");
    if (eSec - sSec < 1800) return setErr("Each segment must be at least 30 minutes");
    if (duration && eSec > duration) return setErr("End is past the video length");
    // Overlap check
    for (const s of existing) {
      if (sSec < s.endSec && eSec > s.startSec) return setErr(`Overlaps "${s.name || "another segment"}"`);
    }
    onSubmit(name.trim().slice(0, 60) || `Part ${existing.length + 1}`, sSec, eSec);
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-md border border-dashed border-border bg-background/50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Segment name"
          maxLength={60}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none ring-ring focus:ring-2"
        />
        <input
          value={start}
          onChange={(e) => setStart(e.target.value)}
          placeholder="Start (h:mm:ss)"
          className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular outline-none ring-ring focus:ring-2"
        />
        <input
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          placeholder="End (h:mm:ss)"
          className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular outline-none ring-ring focus:ring-2"
        />
        <div className="flex items-center gap-1">
          <button
            type="submit"
            className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
          >
            {initial ? "Save" : "Create"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </form>
  );
}

// -------------- Summary Panel --------------

function SummaryPanel({
  summary,
  loading,
  error,
  onRun,
}: {
  summary?: string;
  loading: boolean;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--ember)]" />
          <h2 className="font-display text-xl tracking-tight">AI summary</h2>
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--ember)] px-3 py-1.5 text-xs font-medium text-[oklch(0.2_0.02_60)] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {summary ? "Regenerate" : "Summarize"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {!summary && !loading && (
        <p className="mt-2 text-xs text-muted-foreground">
          Get a concise overview, key takeaways, and things to review. Auto-translated to English if the video isn't already.
        </p>
      )}
      {summary && (
        <div className="prose prose-sm prose-invert mt-3 max-w-none whitespace-pre-wrap text-sm text-foreground/90">
          {summary}
        </div>
      )}
    </div>
  );
}
