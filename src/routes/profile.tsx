import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { LogOut, Trash2, Camera, Save, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — TubeLearn" },
      { name: "description", content: "Manage your TubeLearn account, username, and email." },
      { property: "og:title", content: "Your profile — TubeLearn" },
      { property: "og:description", content: "Manage your TubeLearn account, username, and email." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: ProfilePage,
});

function ProfilePage() {
  const user = useAuth((s) => (s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) : null));
  const updateProfile = useAuth((s) => s.updateProfile);
  const uploadAvatar = useAuth((s) => s.uploadAvatar);
  const removeAvatar = useAuth((s) => s.removeAvatar);
  const changePassword = useAuth((s) => s.changePassword);
  const signOut = useAuth((s) => s.signOut);
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (!user) return <Navigate to="/auth" search={{ mode: "signin", redirect: "/profile" }} />;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateProfile({ name, username, email });
    if (!result.ok) setMsg({ kind: "err", text: result.error });
    else setMsg({ kind: "ok", text: "Profile saved." });
  };

  const onLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ kind: "err", text: "New passwords don't match." });
      return;
    }
    const result = await changePassword(currentPw, newPw);
    if (!result.ok) {
      setPwMsg({ kind: "err", text: result.error });
      return;
    }
    setPwMsg({ kind: "ok", text: "Password updated." });
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  };

  const onDelete = async () => {
    if (!confirm("Delete your account? This removes your profile and cannot be undone.")) return;
    await deleteAccount();
    navigate({ to: "/" });
  };

  const onAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    setAvatarMsg(null);
    const result = await uploadAvatar(file);
    setAvatarBusy(false);
    setAvatarMsg(
      result.ok ? { kind: "ok", text: "Profile picture updated." } : { kind: "err", text: result.error },
    );
  };

  const onAvatarRemove = async () => {
    setAvatarBusy(true);
    setAvatarMsg(null);
    const result = await removeAvatar();
    setAvatarBusy(false);
    setAvatarMsg(
      result.ok ? { kind: "ok", text: "Profile picture removed." } : { kind: "err", text: result.error },
    );
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="flex items-center gap-4">
          <Avatar
            path={user.avatarUrl}
            name={user.name || user.username}
            className="h-16 w-16 rounded-full border border-border text-xl"
          />
          <div>
            <h1 className="font-display text-3xl tracking-tight">Hello {user.username}</h1>
            <p className="text-sm text-muted-foreground">
              Member since{" "}
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · Manage your account & identity.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <Avatar
              path={user.avatarUrl}
              name={user.name || user.username}
              className="h-20 w-20 rounded-full border border-border text-2xl"
            />
            {avatarBusy && (
              <div className="absolute inset-0 grid place-items-center rounded-full bg-background/60">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile picture</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                <Camera className="h-4 w-4" /> {user.avatarUrl ? "Change photo" : "Upload photo"}
              </button>
              {user.avatarUrl && (
                <button
                  type="button"
                  onClick={onAvatarRemove}
                  disabled={avatarBusy}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">JPG or PNG — we crop it to a square for you.</p>
            {avatarMsg && (
              <div
                className={`mt-2 rounded-md border px-3 py-2 text-sm ${
                  avatarMsg.kind === "ok"
                    ? "border-[var(--moss)]/40 bg-[var(--moss)]/10 text-foreground"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {avatarMsg.text}
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarPicked}
          />
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

        <form onSubmit={onChangePassword} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Change password</p>
          </div>
          <PasswordField
            label="Current password"
            value={currentPw}
            onChange={setCurrentPw}
            show={showCurrent}
            toggle={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            value={newPw}
            onChange={setNewPw}
            show={showNew}
            toggle={() => setShowNew((v) => !v)}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPw}
            onChange={setConfirmPw}
            show={showConfirm}
            toggle={() => setShowConfirm((v) => !v)}
            autoComplete="new-password"
          />

          {pwMsg && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                pwMsg.kind === "ok"
                  ? "border-[var(--moss)]/40 bg-[var(--moss)]/10 text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {pwMsg.text}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            <KeyRound className="h-4 w-4" /> Update password
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

function PasswordField({
  label,
  value,
  onChange,
  show,
  toggle,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  autoComplete: string;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 120))}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none ring-ring focus:ring-2"
          autoComplete={autoComplete}
          minLength={6}
          required
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}
