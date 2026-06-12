import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  name: string;
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
}

const uid = () => Math.random().toString(36).slice(2, 10);

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
        const user: StoredUser = { id: uid(), name: name.trim().slice(0, 60), email: e, password, createdAt: Date.now() };
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
        return pub;
      },
    }),
    { name: "tubelearn-auth-v1" },
  ),
);
