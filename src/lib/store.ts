import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  createdAt: number;
}

export interface VideoSegment {
  id: string;
  name: string;
  startSec: number;
  endSec: number;
  watchedSeconds: number;
}

export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  channelUrl?: string;
  thumbnail: string;
  categoryId: string | null;
  addedAt: number;
  completed: boolean;
  watchedSeconds: number;
  notes?: string;
  lastWatchedAt?: number;
  durationSeconds?: number;
  summary?: string;
  segments: VideoSegment[];
}

export interface SessionLog {
  id: string;
  videoId: string;
  seconds: number;
  at: number;
}

interface AppState {
  theme: "dark" | "light";
  categories: Category[];
  videos: Video[];
  sessions: SessionLog[];

  streak: number;
  lastStreakAt: number | null;
  streakWatchedIds: string[];

  hydrated: boolean;

  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;

  addCategory: (c: Omit<Category, "id" | "createdAt">) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addVideo: (v: Omit<Video, "id" | "addedAt" | "completed" | "watchedSeconds" | "segments">) => Video;
  updateVideo: (id: string, patch: Partial<Video>) => void;
  deleteVideo: (id: string) => void;
  toggleComplete: (id: string) => void;
  assignCategory: (videoId: string, categoryId: string | null) => void;

  addSegment: (videoId: string, seg: Omit<VideoSegment, "id" | "watchedSeconds">) => void;
  updateSegment: (videoId: string, segId: string, patch: Partial<VideoSegment>) => void;
  deleteSegment: (videoId: string, segId: string) => void;
  addSegmentWatchTime: (videoId: string, segId: string, seconds: number) => void;
  setVideoSummary: (videoId: string, summary: string) => void;
  setVideoDuration: (videoId: string, seconds: number) => void;

  logSession: (videoId: string, seconds: number) => void;
  bumpStreak: (videoId: string) => void;
  getCurrentStreak: () => number;

  hydrateFromCloud: (userId: string) => Promise<void>;
  resetForSignOut: () => void;
}

const daysBetween = (a: number, b: number) => {
  const da = new Date(a); da.setHours(0, 0, 0, 0);
  const db = new Date(b); db.setHours(0, 0, 0, 0);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const PALETTE = [
  { name: "ember",  swatch: "oklch(0.78 0.15 60)"  },
  { name: "moss",   swatch: "oklch(0.7 0.13 160)"  },
  { name: "sky",    swatch: "oklch(0.72 0.12 230)" },
  { name: "rose",   swatch: "oklch(0.72 0.16 20)"  },
  { name: "violet", swatch: "oklch(0.68 0.15 295)" },
  { name: "sand",   swatch: "oklch(0.78 0.07 85)"  },
  { name: "teal",   swatch: "oklch(0.7 0.1 195)"   },
  { name: "clay",   swatch: "oklch(0.6 0.12 40)"   },
];

// Fire-and-forget helper — logs errors but never blocks UI.
function bg(promise: PromiseLike<{ error: unknown }>, label: string) {
  Promise.resolve(promise).then((r) => {
    if (r && (r as { error?: unknown }).error) console.warn(`[store:${label}]`, (r as { error: unknown }).error);
  }).catch((e) => console.warn(`[store:${label}]`, e));
}

let _userIdGetter: () => string | null = () => null;
export function _setUserIdGetter(fn: () => string | null) { _userIdGetter = fn; }
function currentUserId(): string | null { return _userIdGetter(); }

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      categories: [],
      videos: [],
      sessions: [],
      streak: 0,
      lastStreakAt: null,
      streakWatchedIds: [],
      hydrated: false,

      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (theme) => set({ theme }),

      addCategory: (c) => {
        const cat: Category = { ...c, id: newId(), createdAt: Date.now() };
        set((s) => ({ categories: [...s.categories, cat] }));
        const uid = currentUserId();
        if (uid) {
          bg(
            supabase.from("categories").insert({
              id: cat.id,
              user_id: uid,
              name: cat.name,
              description: cat.description ?? null,
              color: cat.color,
              icon: cat.icon,
              created_at: new Date(cat.createdAt).toISOString(),
            }),
            "addCategory",
          );
        }
        return cat;
      },
      updateCategory: (id, patch) => {
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        const uid = currentUserId();
        if (uid) {
          const p: Record<string, unknown> = {};
          if (patch.name !== undefined) p.name = patch.name;
          if (patch.description !== undefined) p.description = patch.description;
          if (patch.color !== undefined) p.color = patch.color;
          if (patch.icon !== undefined) p.icon = patch.icon;
          bg(supabase.from("categories").update(p as never).eq("id", id).eq("user_id", uid), "updateCategory");
        }
      },
      deleteCategory: (id) => {
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          videos: s.videos.map((v) => (v.categoryId === id ? { ...v, categoryId: null } : v)),
        }));
        const uid = currentUserId();
        if (uid) bg(supabase.from("categories").delete().eq("id", id).eq("user_id", uid), "deleteCategory");
      },

      addVideo: (v) => {
        const vid: Video = { ...v, id: newId(), addedAt: Date.now(), completed: false, watchedSeconds: 0 };
        set((s) => ({ videos: [vid, ...s.videos] }));
        const uid = currentUserId();
        if (uid) {
          bg(
            supabase.from("videos").insert({
              id: vid.id,
              user_id: uid,
              youtube_id: vid.youtubeId,
              title: vid.title,
              channel: vid.channel,
              channel_url: vid.channelUrl ?? null,
              thumbnail: vid.thumbnail,
              category_id: vid.categoryId,
              added_at: new Date(vid.addedAt).toISOString(),
            }),
            "addVideo",
          );
        }
        return vid;
      },
      updateVideo: (id, patch) => {
        set((s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
        const uid = currentUserId();
        if (uid) {
          const p: Record<string, unknown> = {};
          if (patch.title !== undefined) p.title = patch.title;
          if (patch.channel !== undefined) p.channel = patch.channel;
          if (patch.thumbnail !== undefined) p.thumbnail = patch.thumbnail;
          if (patch.categoryId !== undefined) p.category_id = patch.categoryId;
          if (patch.completed !== undefined) p.completed = patch.completed;
          if (patch.watchedSeconds !== undefined) p.watched_seconds = patch.watchedSeconds;
          if (patch.notes !== undefined) p.notes = patch.notes;
          if (patch.lastWatchedAt !== undefined) p.last_watched_at = new Date(patch.lastWatchedAt).toISOString();
          bg(supabase.from("videos").update(p as never).eq("id", id).eq("user_id", uid), "updateVideo");
        }
      },
      deleteVideo: (id) => {
        set((s) => ({
          videos: s.videos.filter((v) => v.id !== id),
          sessions: s.sessions.filter((sess) => sess.videoId !== id),
        }));
        const uid = currentUserId();
        if (uid) bg(supabase.from("videos").delete().eq("id", id).eq("user_id", uid), "deleteVideo");
      },
      toggleComplete: (id) => {
        const now = Date.now();
        const next = !get().videos.find((v) => v.id === id)?.completed;
        set((s) => ({
          videos: s.videos.map((v) =>
            v.id === id ? { ...v, completed: next, lastWatchedAt: now } : v,
          ),
        }));
        const uid = currentUserId();
        if (uid) {
          bg(
            supabase.from("videos").update({ completed: next, last_watched_at: new Date(now).toISOString() })
              .eq("id", id).eq("user_id", uid),
            "toggleComplete",
          );
        }
      },
      assignCategory: (videoId, categoryId) => {
        set((s) => ({
          videos: s.videos.map((v) => (v.id === videoId ? { ...v, categoryId } : v)),
        }));
        const uid = currentUserId();
        if (uid) bg(supabase.from("videos").update({ category_id: categoryId }).eq("id", videoId).eq("user_id", uid), "assignCategory");
      },

      logSession: (videoId, seconds) => {
        const at = Date.now();
        const sessId = newId();
        set((s) => ({
          sessions: [{ id: sessId, videoId, seconds, at }, ...s.sessions].slice(0, 500),
          videos: s.videos.map((v) =>
            v.id === videoId
              ? { ...v, watchedSeconds: v.watchedSeconds + seconds, lastWatchedAt: at }
              : v,
          ),
        }));
        const uid = currentUserId();
        if (uid) {
          const total = get().videos.find((v) => v.id === videoId)?.watchedSeconds ?? 0;
          bg(
            supabase.from("sessions").insert({
              id: sessId,
              user_id: uid,
              video_id: videoId,
              seconds,
              at: new Date(at).toISOString(),
            }),
            "logSession.insert",
          );
          bg(
            supabase.from("videos")
              .update({ watched_seconds: total, last_watched_at: new Date(at).toISOString() })
              .eq("id", videoId).eq("user_id", uid),
            "logSession.update",
          );
        }
      },

      bumpStreak: () => {
        const now = Date.now();
        const { lastStreakAt, streak } = get();
        let nextStreak = streak;
        let nextLast = lastStreakAt;
        if (!lastStreakAt) {
          nextStreak = 1; nextLast = now;
        } else {
          const diff = daysBetween(lastStreakAt, now);
          if (diff === 0) return;
          if (diff === 1) { nextStreak = streak + 1; nextLast = now; }
          else { nextStreak = 1; nextLast = now; }
        }
        set({ streak: nextStreak, lastStreakAt: nextLast, streakWatchedIds: [] });
        const uid = currentUserId();
        if (uid) {
          bg(
            supabase.from("streaks").upsert({
              user_id: uid,
              streak: nextStreak,
              last_streak_at: new Date(nextLast!).toISOString(),
            }, { onConflict: "user_id" }),
            "bumpStreak",
          );
        }
      },
      getCurrentStreak: () => {
        const { lastStreakAt, streak } = get();
        if (!lastStreakAt) return 0;
        const diff = daysBetween(lastStreakAt, Date.now());
        if (diff > 1) return 0;
        return streak;
      },

      hydrateFromCloud: async (userId: string) => {
        const [catsRes, vidsRes, sessRes, streakRes] = await Promise.all([
          supabase.from("categories").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
          supabase.from("videos").select("*").eq("user_id", userId).order("added_at", { ascending: false }),
          supabase.from("sessions").select("*").eq("user_id", userId).order("at", { ascending: false }).limit(500),
          supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
        ]);

        const categories: Category[] = (catsRes.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? undefined,
          color: c.color,
          icon: c.icon,
          createdAt: new Date(c.created_at).getTime(),
        }));
        const videos: Video[] = (vidsRes.data ?? []).map((v) => ({
          id: v.id,
          youtubeId: v.youtube_id,
          title: v.title,
          channel: v.channel,
          channelUrl: v.channel_url ?? undefined,
          thumbnail: v.thumbnail,
          categoryId: v.category_id,
          completed: v.completed,
          watchedSeconds: v.watched_seconds,
          notes: v.notes ?? undefined,
          lastWatchedAt: v.last_watched_at ? new Date(v.last_watched_at).getTime() : undefined,
          addedAt: new Date(v.added_at).getTime(),
        }));
        const sessions: SessionLog[] = (sessRes.data ?? []).map((s) => ({
          id: s.id,
          videoId: s.video_id ?? "",
          seconds: s.seconds,
          at: new Date(s.at).getTime(),
        }));
        const streak = streakRes.data?.streak ?? 0;
        const lastStreakAt = streakRes.data?.last_streak_at ? new Date(streakRes.data.last_streak_at).getTime() : null;

        set({ categories, videos, sessions, streak, lastStreakAt, hydrated: true });
      },

      resetForSignOut: () =>
        set({
          categories: [],
          videos: [],
          sessions: [],
          streak: 0,
          lastStreakAt: null,
          streakWatchedIds: [],
          hydrated: false,
        }),
    }),
    {
      name: "tubelearn-store-v2",
      // Only persist the theme locally; data lives in the cloud.
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  return `${mo}mo ago`;
}
