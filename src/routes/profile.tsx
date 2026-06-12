import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, Trash2, UserCircle2, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — TubeLearn" },
      { name: "description", content: "Manage your TubeLearn account, username, and email." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const user = useAuth((s) => (s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) : null));
  const updateProfile = useAuth((s) => s.updateProfile);
  const signOut = useAuth((s) => s.signOut);
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (!user) return <Navigate to="/auth" search={{ mode: "signin", redirect: "/profile" }} />;

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    const result = updateProfile({ name, username, email });
    if (!result.ok) setMsg({ kind: "err", text: result.error });
    else setMsg({ kind: "ok", text: "Profile saved." });
  };

  const onLogout = () => {
    signOut();
    navigate({ to: "/" });
  };

  const onDelete = () => {
    if (!confirm("Delete your account? This removes your profile and cannot be undone.")) return;
    deleteAccount();
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--ember)] text-[oklch(0.2_0.02_60)]">
            <UserCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight">Hello {user.username}</h1>
            <p className="text-sm text-muted-foreground">Manage your account & identity.</p>
          </div>
        </div>

        <form onSubmit={onSave} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
          <Field label="Full name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              required
            />
          </Field>
          <Field label="Username">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.slice(0, 24))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Lowercase letters, numbers, and underscores.</p>
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 120))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              required
            />
          </Field>

          {msg && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                msg.kind === "ok"
                  ? "border-[var(--moss)]/40 bg-[var(--moss)]/10 text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            <Save className="h-4 w-4" /> Save changes
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Session</p>
          <button
            onClick={onLogout}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-destructive">Danger zone</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete your account, profile, and all associated data.
          </p>
          <button
            onClick={onDelete}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4" /> Delete account
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
