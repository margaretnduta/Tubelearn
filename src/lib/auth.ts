import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { runMigrationIfNeeded, clearLocalData } from "@/lib/migration";
import { useStore, _setUserIdGetter } from "@/lib/store";

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: number;
}

type Result<T = void> = ({ ok: true } & T) | { ok: false; error: string };

interface AuthState {
  users: AuthUser[]; // length 0 or 1 — kept as array for existing selectors
  currentUserId: string | null;
  loading: boolean;

  signUp: (name: string, email: string, password: string) => Promise<Result<{ user: AuthUser }>>;
  signIn: (email: string, password: string) => Promise<Result<{ user: AuthUser }>>;
  signInWithGoogle: () => Promise<Result>;
  signOut: () => Promise<void>;
  currentUser: () => AuthUser | null;
  updateProfile: (patch: { name?: string; username?: string; email?: string }) => Promise<Result>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<Result>;
  resetPassword: (email: string, _newPassword?: string) => Promise<Result>;
  deleteAccount: () => Promise<void>;

  // Internal — set from onAuthStateChange listener
  _setProfile: (user: AuthUser | null) => void;
}

const slugifyUsername = (raw: string) =>
  raw.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 20) ||
  `user_${Math.random().toString(36).slice(2, 8)}`;

export const useAuth = create<AuthState>()((set, get) => ({
  users: [],
  currentUserId: null,
  loading: true,

  _setProfile: (user) =>
    set({ users: user ? [user] : [], currentUserId: user?.id ?? null, loading: false }),

  signUp: async (name, email, password) => {
    const e = email.trim().toLowerCase();
    if (!name.trim()) return { ok: false, error: "Please enter your name." };
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    const emailRedirectTo = typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: e,
      password,
      options: {
        emailRedirectTo,
        data: { name: name.trim().slice(0, 60), username: slugifyUsername(name) },
      },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: "Signup failed." };
    // Session may or may not exist depending on email confirmation setting.
    const user: AuthUser = {
      id: data.user.id,
      name: name.trim(),
      username: slugifyUsername(name),
      email: e,
      createdAt: Date.now(),
    };
    return { ok: true, user };
  },

  signIn: async (email, password) => {
    const e = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: "Sign in failed." };
    const profile = await fetchProfile(data.user.id);
    return { ok: true, user: profile ?? { id: data.user.id, name: "", username: "", email: e, createdAt: Date.now() } };
  },

  signInWithGoogle: async () => {
    if (typeof window === "undefined") return { ok: false, error: "Unavailable" };
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if ((result as { error?: unknown }).error) {
      const err = (result as { error: Error }).error;
      return { ok: false, error: err.message || "Google sign-in failed." };
    }
    return { ok: true };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    useStore.getState().resetForSignOut();
    set({ users: [], currentUserId: null });
  },

  currentUser: () => {
    const id = get().currentUserId;
    if (!id) return null;
    return get().users.find((u) => u.id === id) ?? null;
  },

  updateProfile: async (patch) => {
    const id = get().currentUserId;
    if (!id) return { ok: false, error: "Not signed in." };
    const next: Record<string, string> = {};
    if (patch.name !== undefined) {
      const n = patch.name.trim();
      if (!n) return { ok: false, error: "Name can't be empty." };
      next.name = n.slice(0, 60);
    }
    if (patch.username !== undefined) {
      const u = slugifyUsername(patch.username);
      if (u.length < 3) return { ok: false, error: "Username must be at least 3 characters." };
      next.username = u;
    }
    if (patch.email !== undefined) {
      const em = patch.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { ok: false, error: "Please enter a valid email." };
      const { error: authErr } = await supabase.auth.updateUser({ email: em });
      if (authErr) return { ok: false, error: authErr.message };
      next.email = em;
    }
    if (Object.keys(next).length) {
      const { error } = await supabase.from("profiles").update(next as never).eq("id", id);
      if (error) {
        if (error.code === "23505") return { ok: false, error: "That username is already taken." };
        return { ok: false, error: error.message };
      }
      const cur = get().users.find((u) => u.id === id);
      if (cur) set({ users: [{ ...cur, ...next }] });
    }
    return { ok: true };
  },

  changePassword: async (_currentPassword, newPassword) => {
    if (newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  resetPassword: async (email) => {
    const redirectTo = typeof window !== "undefined" ? window.location.origin + "/auth" : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  deleteAccount: async () => {
    const id = get().currentUserId;
    if (!id) return;
    try {
      const { deleteMyAccount } = await import("@/lib/account.functions");
      await deleteMyAccount();
    } catch (e) {
      console.error("[deleteAccount]", e);
    }
    await supabase.auth.signOut();
    clearLocalData(id);
    useStore.getState().resetForSignOut();
    set({ users: [], currentUserId: null });
  },
}));

async function fetchProfile(id: string): Promise<AuthUser | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name ?? "",
    username: data.username ?? "",
    email: data.email ?? "",
    createdAt: new Date(data.created_at).getTime(),
  };
}

let _initialized = false;

/** Call once on app mount. Wires supabase.auth listener → useAuth store, runs migration, hydrates data store. */
export function initAuth() {
  if (_initialized || typeof window === "undefined") return;
  _initialized = true;
  _setUserIdGetter(() => useAuth.getState().currentUserId);

  const handle = async (userId: string | null) => {
    if (!userId) {
      useAuth.getState()._setProfile(null);
      useStore.getState().resetForSignOut();
      return;
    }
    // Ensure profile exists (trigger normally creates it, but retry a few times if lagging).
    let profile: AuthUser | null = null;
    for (let i = 0; i < 4 && !profile; i++) {
      profile = await fetchProfile(userId);
      if (!profile) await new Promise((r) => setTimeout(r, 300));
    }
    useAuth.getState()._setProfile(profile);
    try {
      await runMigrationIfNeeded(userId);
    } catch (e) {
      console.warn("[migration]", e);
    }
    await useStore.getState().hydrateFromCloud(userId);
  };

  supabase.auth.getSession().then(({ data }) => {
    handle(data.session?.user?.id ?? null);
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
    handle(session?.user?.id ?? null);
  });
}
