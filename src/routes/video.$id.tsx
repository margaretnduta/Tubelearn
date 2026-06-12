import { createFileRoute, Link, Navigate, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Trash2, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore, formatDuration, relativeTime } from "@/lib/store";
import { useAuth } from "@/lib/auth";

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

function VideoPage() {
  const userId = useAuth((s) => s.currentUserId);
  const { id } = Route.useParams();
  const video = useStore((s) => s.videos.find((v) => v.id === id));
  const categories = useStore((s) => s.categories);
  const otherInCategory = useStore((s) => s.videos.filter((v) => v.id !== id && v.categoryId === video?.categoryId));
  const updateVideo = useStore((s) => s.updateVideo);
  const toggleComplete = useStore((s) => s.toggleComplete);
  const deleteVideo = useStore((s) => s.deleteVideo);
  const assignCategory = useStore((s) => s.assignCategory);
  const logSession = useStore((s) => s.logSession);

  const [notes, setNotes] = useState(video?.notes ?? "");
  const sessionStart = useRef<number | null>(null);

  // Track watch time while page is open
  useEffect(() => {
    sessionStart.current = Date.now();
    const flush = () => {
      if (sessionStart.current && video) {
        const sec = Math.round((Date.now() - sessionStart.current) / 1000);
        if (sec >= 5) logSession(video.id, sec);
        sessionStart.current = Date.now();
      }
    };
    const interval = setInterval(flush, 30_000);
    const onHide = () => flush();
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      clearInterval(interval);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [video?.id, logSession, video]);

  if (!userId) return <Navigate to="/auth" search={{ mode: "signin", redirect: `/video/${id}` }} />;
  if (!video) throw notFound();

  const category = categories.find((c) => c.id === video.categoryId);

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
                <iframe
                  key={video.youtubeId}
                  src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>

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
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Progress</p>
              <div className="mt-1 font-display text-3xl tracking-tight tabular">{formatDuration(video.watchedSeconds)}</div>
              <p className="text-xs text-muted-foreground">on this video</p>

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
