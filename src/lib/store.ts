import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string; // oklch swatch token name from PALETTE
  icon: string;  // emoji or letter
  createdAt: number;
}

export interface Video {
  id: string;            // local uuid
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
  streakWatchedIds: string[]; // videos counted in the current streak

  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;

  addCategory: (c: Omit<Category, "id" | "createdAt">) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addVideo: (v: Omit<Video, "id" | "addedAt" | "completed" | "watchedSeconds">) => Video;
  updateVideo: (id: string, patch: Partial<Video>) => void;
  deleteVideo: (id: string) => void;
  toggleComplete: (id: string) => void;
  assignCategory: (videoId: string, categoryId: string | null) => void;

  logSession: (videoId: string, seconds: number) => void;
  bumpStreak: (videoId: string) => void;
  getCurrentStreak: () => number;
}

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const daysBetween = (a: number, b: number) => {
  const da = new Date(a); da.setHours(0, 0, 0, 0);
  const db = new Date(b); db.setHours(0, 0, 0, 0);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const PALETTE = [
  { name: "ember",   swatch: "oklch(0.78 0.15 60)"  },
  { name: "moss",    swatch: "oklch(0.7 0.13 160)"  },
  { name: "sky",     swatch: "oklch(0.72 0.12 230)" },
  { name: "rose",    swatch: "oklch(0.72 0.16 20)"  },
  { name: "violet",  swatch: "oklch(0.68 0.15 295)" },
  { name: "sand",    swatch: "oklch(0.78 0.07 85)"  },
  { name: "teal",    swatch: "oklch(0.7 0.1 195)"   },
  { name: "clay",    swatch: "oklch(0.6 0.12 40)"   },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: uid(), name: "Foundations", description: "Core concepts you keep coming back to.", color: "oklch(0.78 0.15 60)",  icon: "◐", createdAt: Date.now() },
  { id: uid(), name: "Deep Work",   description: "Long-form lectures and series.",         color: "oklch(0.7 0.13 160)",  icon: "◇", createdAt: Date.now() + 1 },
  { id: uid(), name: "Quick Hits",  description: "Short videos worth revisiting.",         color: "oklch(0.72 0.12 230)", icon: "✦", createdAt: Date.now() + 2 },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      categories: DEFAULT_CATEGORIES,
      videos: [],
      sessions: [],

      streak: 0,
      lastStreakAt: null,
      streakWatchedIds: [],

      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (theme) => set({ theme }),

      addCategory: (c) => {
        const cat: Category = { ...c, id: uid(), createdAt: Date.now() };
        set((s) => ({ categories: [...s.categories, cat] }));
        return cat;
      },
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          videos: s.videos.map((v) => (v.categoryId === id ? { ...v, categoryId: null } : v)),
        })),

      addVideo: (v) => {
        const vid: Video = { ...v, id: uid(), addedAt: Date.now(), completed: false, watchedSeconds: 0 };
        set((s) => ({ videos: [vid, ...s.videos] }));
        return vid;
      },
      updateVideo: (id, patch) =>
        set((s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      deleteVideo: (id) =>
        set((s) => ({
          videos: s.videos.filter((v) => v.id !== id),
          sessions: s.sessions.filter((sess) => sess.videoId !== id),
        })),
      toggleComplete: (id) =>
        set((s) => ({
          videos: s.videos.map((v) =>
            v.id === id ? { ...v, completed: !v.completed, lastWatchedAt: Date.now() } : v,
          ),
        })),
      assignCategory: (videoId, categoryId) =>
        set((s) => ({
          videos: s.videos.map((v) => (v.id === videoId ? { ...v, categoryId } : v)),
        })),

      logSession: (videoId, seconds) =>
        set((s) => ({
          sessions: [{ id: uid(), videoId, seconds, at: Date.now() }, ...s.sessions].slice(0, 500),
          videos: s.videos.map((v) =>
            v.id === videoId
              ? { ...v, watchedSeconds: v.watchedSeconds + seconds, lastWatchedAt: Date.now() }
              : v,
          ),
        })),

      bumpStreak: (videoId) => {
        const now = Date.now();
        const { lastStreakAt, streak, streakWatchedIds } = get();
        const expired = !lastStreakAt || now - lastStreakAt > STREAK_WINDOW_MS;
        if (expired) {
          set({ streak: 1, lastStreakAt: now, streakWatchedIds: [videoId] });
          return;
        }
        if (streakWatchedIds.includes(videoId)) {
          // Same video within window — refresh the window but don't double-count.
          set({ lastStreakAt: now });
          return;
        }
        set({
          streak: streak + 1,
          lastStreakAt: now,
          streakWatchedIds: [...streakWatchedIds, videoId].slice(-200),
        });
      },

      getCurrentStreak: () => {
        const { lastStreakAt, streak } = get();
        if (!lastStreakAt) return 0;
        if (Date.now() - lastStreakAt > STREAK_WINDOW_MS) return 0;
        return streak;
      },
    }),
    { name: "lumen-store-v1" },
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
