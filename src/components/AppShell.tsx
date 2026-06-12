import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, Plus, LayoutDashboard, Library, Sparkles, LogOut, GraduationCap, Github, Mail, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { AddVideoDialog } from "./AddVideoDialog";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openAdd, setOpenAdd] = useState(false);
  const [openNav, setOpenNav] = useState(false);

  const user = useAuth((s) => (s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) : null));
  const signOut = useAuth((s) => s.signOut);
  const navigate = useNavigate();

  const navItems = [
    { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/library" as const, label: "Library", icon: Library, exact: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-8">
          <Sheet open={openNav} onOpenChange={setOpenNav}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground sm:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--ember)] text-[oklch(0.2_0.02_60)]">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <span className="font-display text-xl tracking-tight">TubeLearn</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3">
                {navItems.map((n) => {
                  const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpenNav(false)}
                      className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${
                        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <n.icon className="h-4 w-4" />
                      {n.label}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { setOpenNav(false); setOpenAdd(true); }}
                  className="mt-2 flex items-center gap-3 rounded-md bg-foreground px-3 py-3 text-sm font-medium text-background"
                >
                  <Plus className="h-4 w-4" /> Add video
                </button>
                {user && (
                  <button
                    onClick={() => { setOpenNav(false); signOut(); navigate({ to: "/" }); }}
                    className="mt-1 flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2" aria-label="TubeLearn home">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--ember)] text-[oklch(0.2_0.02_60)]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display text-xl tracking-tight">TubeLearn</span>
            <span className="hidden md:inline rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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
              className="hidden items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:flex"
            >
              <Plus className="h-4 w-4" />
              <span>Add video</span>
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user && (
              <div className="hidden items-center gap-2 border-l border-border pl-2 sm:flex">
                <div className="hidden text-right md:block">
                  <div className="text-xs font-medium leading-tight">{user.name}</div>
                  <div className="text-[10px] leading-tight text-muted-foreground">{user.email}</div>
                </div>
                <button
                  onClick={() => { signOut(); navigate({ to: "/" }); }}
                  aria-label="Sign out"
                  className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-border bg-card/40 sm:mt-24" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--ember)] text-[oklch(0.2_0.02_60)]">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <span className="font-display text-lg tracking-tight">TubeLearn</span>
              </div>
              <p className="mt-3 max-w-xs text-xs text-muted-foreground">
                Turning YouTube into deliberate study — one category, one minute at a time.
              </p>
            </div>
            <FooterCol title="Product">
              <FooterLink to="/dashboard">Dashboard</FooterLink>
              <FooterLink to="/library">Library</FooterLink>
              <button
                onClick={() => setOpenAdd(true)}
                className="text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Add a video
              </button>
            </FooterCol>
            <FooterCol title="Account">
              {user ? (
                <button
                  onClick={() => { signOut(); navigate({ to: "/" }); }}
                  className="text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link to="/auth" search={{ mode: "signin" }} className="text-xs text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
                  <Link to="/auth" search={{ mode: "signup" }} className="text-xs text-muted-foreground transition-colors hover:text-foreground">Create account</Link>
                </>)}
              <FooterLink to="/">Home</FooterLink>
            </FooterCol>
            <FooterCol title="Connect">
              <a
                href="mailto:hello@tubelearn.app"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-3 w-3" /> hello@tubelearn.app
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-3 w-3" /> GitHub
              </a>
            </FooterCol>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>© {new Date().getFullYear()} TubeLearn. Study, not scroll.</span>
            </div>
            <span className="tabular">v0.1</span>
          </div>
        </div>
      </footer>

      <AddVideoDialog open={openAdd} onOpenChange={setOpenAdd} />
    </div>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FooterLink({ to, children }: { to: "/" | "/dashboard" | "/library"; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
