import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: number;
}

interface StoredUser extends AuthUser {
  // NOTE: This is a local-only demo auth. Passwords are stored in localStorage
  // unencrypted. Do not reuse a real password here.
  password: string;
}

interface AuthState {
  users: StoredUser[];
  currentUserId: string | null;
  signUp: (name: string, email: string, password: string) => { ok: true; user: AuthUser } | { ok: false; error: string };
  signIn: (email: string, password: string) => { ok: true; user: AuthUser } | { ok: false; error: string };
  signOut: () => void;
  currentUser: () => AuthUser | null;
  updateProfile: (patch: { name?: string; username?: string; email?: string }) => { ok: true } | { ok: false; error: string };
  changePassword: (currentPassword: string, newPassword: string) => { ok: true } | { ok: false; error: string };
  deleteAccount: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const slugifyUsername = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20) || `user_${uid()}`;

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,

      signUp: (name, email, password) => {
        const e = email.trim().toLowerCase();
        if (!name.trim()) return { ok: false, error: "Please enter your name." };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "Please enter a valid email." };
        if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
        if (get().users.some((u) => u.email === e)) return { ok: false, error: "An account with this email already exists." };
        let username = slugifyUsername(name);
        const taken = new Set(get().users.map((u) => u.username));
        while (taken.has(username)) username = `${slugifyUsername(name)}_${uid().slice(0, 3)}`;
        const user: StoredUser = { id: uid(), name: name.trim().slice(0, 60), username, email: e, password, createdAt: Date.now() };
        set((s) => ({ users: [...s.users, user], currentUserId: user.id }));
        const { password: _p, ...pub } = user;
        return { ok: true, user: pub };
      },

      signIn: (email, password) => {
        const e = email.trim().toLowerCase();
        const user = get().users.find((u) => u.email === e);
        if (!user || user.password !== password) return { ok: false, error: "Wrong email or password." };
        set({ currentUserId: user.id });
        const { password: _p, ...pub } = user;
        return { ok: true, user: pub };
      },

      signOut: () => set({ currentUserId: null }),

      currentUser: () => {
        const id = get().currentUserId;
        if (!id) return null;
        const u = get().users.find((x) => x.id === id);
        if (!u) return null;
        const { password: _p, ...pub } = u;
        // Backfill username for accounts created before usernames existed.
        return { ...pub, username: pub.username || slugifyUsername(pub.name || pub.email) };
      },

      updateProfile: (patch) => {
        const id = get().currentUserId;
        if (!id) return { ok: false, error: "Not signed in." };
        const users = get().users;
        const current = users.find((u) => u.id === id);
        if (!current) return { ok: false, error: "Account not found." };

        const next: Partial<StoredUser> = {};
        if (patch.name !== undefined) {
          const n = patch.name.trim();
          if (!n) return { ok: false, error: "Name can't be empty." };
          next.name = n.slice(0, 60);
        }
        if (patch.username !== undefined) {
          const u = slugifyUsername(patch.username);
          if (u.length < 3) return { ok: false, error: "Username must be at least 3 characters." };
          if (users.some((x) => x.id !== id && x.username === u)) return { ok: false, error: "That username is taken." };
          next.username = u;
        }
        if (patch.email !== undefined) {
          const e = patch.email.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "Please enter a valid email." };
          if (users.some((x) => x.id !== id && x.email === e)) return { ok: false, error: "That email is already in use." };
          next.email = e;
        }
        set({ users: users.map((u) => (u.id === id ? { ...u, ...next } : u)) });
        return { ok: true };
      },

  resetPassword: (email: string, newPassword: string) => {
        const e = email.trim().toLowerCase();
        const users = get().users;
        const user = users.find((u) => u.email === e);
        if (!user) return { ok: false as const, error: "No account exists on this device for that email." };
        if (newPassword.length < 6) return { ok: false as const, error: "New password must be at least 6 characters." };
        set({ users: users.map((u) => (u.id === user.id ? { ...u, password: newPassword } : u)) });
        return { ok: true as const };
      },

      changePassword: (currentPassword, newPassword) => {
        const id = get().currentUserId;
        if (!id) return { ok: false, error: "Not signed in." };
        const users = get().users;
        const current = users.find((u) => u.id === id);
        if (!current) return { ok: false, error: "Account not found." };
        if (current.password !== currentPassword) return { ok: false, error: "Current password is incorrect." };
        if (newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters." };
        if (newPassword === currentPassword) return { ok: false, error: "New password must be different." };
        set({ users: users.map((u) => (u.id === id ? { ...u, password: newPassword } : u)) });
        return { ok: true };
      },

      deleteAccount: () => {
        const id = get().currentUserId;
        if (!id) return;
        set((s) => ({ users: s.users.filter((u) => u.id !== id), currentUserId: null }));
      },
    }),
    { name: "tubelearn-auth-v1" },
  ),
);
