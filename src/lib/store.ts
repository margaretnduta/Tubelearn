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

interface LumenState {
  theme: "dark" | "light";
  categories: Category[];
  videos: Video[];
  sessions: SessionLog[];

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
}

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

export const useStore = create<LumenState>()(
  persist(
    (set) => ({
      theme: "dark",
      categories: DEFAULT_CATEGORIES,
      videos: [],
      sessions: [],

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
