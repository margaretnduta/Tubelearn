import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, Plus, LayoutDashboard, Library, Sparkles, LogOut, GraduationCap, Home, Github, Mail } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { AddVideoDialog } from "./AddVideoDialog";

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openAdd, setOpenAdd] = useState(false);

  const user = useAuth((s) => (s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) : null));
  const signOut = useAuth((s) => s.signOut);
  const navigate = useNavigate();

  const navItems = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/library", label: "Library", icon: Library, exact: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-8">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--ember)] text-[oklch(0.2_0.02_60)]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display text-xl tracking-tight">TubeLearn</span>
            <span className="hidden sm:inline rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Study
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {navItems.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[17px] h-px bg-[var(--ember)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setOpenAdd(true)}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add video</span>
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user && (
              <div className="flex items-center gap-2 border-l border-border pl-2">
                <div className="hidden text-right sm:block">
                  <div className="text-xs font-medium leading-tight">{user.name}</div>
                  <div className="text-[10px] leading-tight text-muted-foreground">{user.email}</div>
                </div>
                <button
                  onClick={() => { signOut(); navigate({ to: "/" }); }}
                  aria-label="Sign out"
                  className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>TubeLearn — turning YouTube into deliberate study.</span>
          </div>
          <span className="tabular">v0.1</span>
        </div>
      </footer>

      <AddVideoDialog open={openAdd} onOpenChange={setOpenAdd} />
    </div>
  );
}
