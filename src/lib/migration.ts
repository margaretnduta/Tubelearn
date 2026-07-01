import { supabase } from "@/integrations/supabase/client";

const LEGACY_STORE_KEY = "lumen-store-v1";
const LEGACY_AUTH_KEY = "tubelearn-auth-v1";
const MIGRATED_FLAG = (userId: string) => `tubelearn-migrated:${userId}`;

interface LegacyCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  createdAt: number;
}
interface LegacyVideo {
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
}
interface LegacySession {
  id: string;
  videoId: string;
  seconds: number;
  at: number;
}
interface LegacyStoreShape {
  state?: {
    categories?: LegacyCategory[];
    videos?: LegacyVideo[];
    sessions?: LegacySession[];
    streak?: number;
    lastStreakAt?: number | null;
  };
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Detects and inventories any local-storage data present on this device
 * that belongs to the pre-cloud version of the app. Safe to call anytime;
 * does nothing if no legacy data exists.
 */
export function inventoryLocalData() {
  if (typeof window === "undefined") return { hasData: false, counts: { categories: 0, videos: 0, sessions: 0 } };
  const store = safeParse<LegacyStoreShape>(localStorage.getItem(LEGACY_STORE_KEY));
  const s = store?.state ?? {};
  return {
    hasData: Boolean((s.categories?.length ?? 0) + (s.videos?.length ?? 0) + (s.sessions?.length ?? 0)),
    counts: {
      categories: s.categories?.length ?? 0,
      videos: s.videos?.length ?? 0,
      sessions: s.sessions?.length ?? 0,
    },
  };
}

/**
 * Migrates any pre-existing local storage data on this device to the current
 * user's cloud account. Idempotent — sets a per-user "migrated" flag on success
 * so subsequent logins skip re-syncing. Uses upsert with the legacy id stored
 * in `local_id` to prevent duplicates across partial retries.
 */
export async function runMigrationIfNeeded(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_FLAG(userId))) return;

  const store = safeParse<LegacyStoreShape>(localStorage.getItem(LEGACY_STORE_KEY));
  const s = store?.state;
  if (!s) {
    localStorage.setItem(MIGRATED_FLAG(userId), "1");
    return;
  }

  const legacyCategories = (s.categories ?? []).filter((c) => c && c.id && c.name);
  const legacyVideos = (s.videos ?? []).filter((v) => v && v.id && v.youtubeId);
  const legacySessions = (s.sessions ?? []).filter((se) => se && se.id);

  // 1. Upload categories, mapping local id -> new cloud uuid.
  const catIdMap = new Map<string, string>();
  if (legacyCategories.length) {
    const rows = legacyCategories.map((c) => ({
      user_id: userId,
      name: c.name.slice(0, 60),
      description: c.description?.slice(0, 500) ?? null,
      color: c.color,
      icon: c.icon,
      local_id: c.id,
      created_at: new Date(c.createdAt || Date.now()).toISOString(),
    }));
    const { data, error } = await supabase
      .from("categories")
      .upsert(rows, { onConflict: "user_id,local_id", ignoreDuplicates: false })
      .select("id, local_id");
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.local_id) catIdMap.set(row.local_id, row.id);
    }
  }

  // 2. Upload videos.
  const vidIdMap = new Map<string, string>();
  if (legacyVideos.length) {
    const rows = legacyVideos.map((v) => ({
      user_id: userId,
      youtube_id: v.youtubeId,
      title: (v.title || "Untitled").slice(0, 200),
      channel: (v.channel || "").slice(0, 100),
      channel_url: v.channelUrl ?? null,
      thumbnail: v.thumbnail || "",
      category_id: v.categoryId ? catIdMap.get(v.categoryId) ?? null : null,
      completed: !!v.completed,
      watched_seconds: Math.max(0, Math.floor(v.watchedSeconds || 0)),
      notes: v.notes ?? null,
      last_watched_at: v.lastWatchedAt ? new Date(v.lastWatchedAt).toISOString() : null,
      local_id: v.id,
      added_at: new Date(v.addedAt || Date.now()).toISOString(),
    }));
    const { data, error } = await supabase
      .from("videos")
      .upsert(rows, { onConflict: "user_id,local_id", ignoreDuplicates: false })
      .select("id, local_id");
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.local_id) vidIdMap.set(row.local_id, row.id);
    }
  }

  // 3. Upload sessions (best-effort; no unique constraint, so only migrate once via the flag).
  if (legacySessions.length) {
    const rows = legacySessions
      .map((se) => {
        const cloudVideoId = vidIdMap.get(se.videoId);
        if (!cloudVideoId) return null;
        return {
          user_id: userId,
          video_id: cloudVideoId,
          seconds: Math.max(0, Math.floor(se.seconds || 0)),
          at: new Date(se.at || Date.now()).toISOString(),
        };
      })
      .filter(Boolean) as Array<{ user_id: string; video_id: string; seconds: number; at: string }>;
    if (rows.length) {
      const { error } = await supabase.from("sessions").insert(rows);
      if (error) console.warn("[migration] sessions", error);
    }
  }

  // 4. Migrate streak.
  if (s.streak && s.lastStreakAt) {
    const { error } = await supabase.from("streaks").upsert(
      {
        user_id: userId,
        streak: s.streak,
        last_streak_at: new Date(s.lastStreakAt).toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) console.warn("[migration] streak", error);
  }

  // 5. Success — set flag and clear legacy blob so we never re-sync.
  localStorage.setItem(MIGRATED_FLAG(userId), "1");
  localStorage.removeItem(LEGACY_STORE_KEY);
  localStorage.removeItem(LEGACY_AUTH_KEY);
}

/** Wipe all local-storage traces for this user (invoked on account deletion). */
export function clearLocalData(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MIGRATED_FLAG(userId));
  localStorage.removeItem(LEGACY_STORE_KEY);
  localStorage.removeItem(LEGACY_AUTH_KEY);
}
