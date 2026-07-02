import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Layers, Clock, CheckCircle2, ArrowRight, Mail, Github, Sparkles, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { InstallAppButton } from "@/components/InstallAppButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TubeLearn — Turn YouTube into deliberate study" },
      { name: "description", content: "Organize YouTube videos into learning categories, track minutes watched, and complete subjects with intention." },
    ],
  }),
  component: Landing,
});

function useIsInstalled() {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () =>
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setInstalled(check());
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => setInstalled(check());
    mq?.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onChange);
    };
  }, []);
  return installed;
}

function Landing() {
  const userId = useAuth((s) => s.currentUserId);
  const isInstalled = useIsInstalled();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--ember)] text-[oklch(0.2_0.02_60)]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display text-xl tracking-tight">TubeLearn</span>
          </Link>
          <div className="flex items-center gap-2">
            {userId ? (
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "signin" }} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                  Sign in
                </Link>
                <Link to="/auth" search={{ mode: "signup" }} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ember)]">Study, not scroll</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
          Turn YouTube into a <em className="text-[var(--ember)]">real curriculum</em>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
          TubeLearn lets you organize videos by subject, watch with intent, and track every minute you spend learning — not just bingeing.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {userId ? (
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-md bg-[var(--ember)] px-5 py-3 text-sm font-medium text-[oklch(0.2_0.02_60)]">
              Open your dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-md bg-[var(--ember)] px-5 py-3 text-sm font-medium text-[oklch(0.2_0.02_60)]">
                Create your account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/auth" search={{ mode: "signin" }} className="rounded-md border border-border bg-card px-5 py-3 text-sm font-medium">
                I already have one
              </Link>
            </>
          )}
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-3 sm:px-8">
        <Feature icon={Layers} title="Categories" body="Create shelves per subject. Paste any YouTube link and sort it in." />
        <Feature icon={Clock} title="Minutes tracked" body="Every session counts. See exactly how long you've spent on each topic." />
        <Feature icon={CheckCircle2} title="New → In Progress → Done" body="Each video has a real state. Finish the shelf, finish the subject." />
      </section>

      {!isInstalled && (
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                <Smartphone className="h-3 w-3" /> Installable app
              </div>
              <h2 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">Install TubeLearn on your phone</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Open this page in your mobile browser and choose <em>Add to Home Screen</em> (iOS Safari) or <em>Install app</em> (Android Chrome) to launch TubeLearn from your home screen — full screen, no browser bar.
              </p>
            </div>
            <InstallAppButton label="Install app" />

          </div>
        </div>
      </section>
      )}

      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link to="/" className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--ember)] text-[oklch(0.2_0.02_60)]">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <span className="font-display text-xl tracking-tight">TubeLearn</span>
              </Link>
              <p className="mt-3 max-w-xs text-xs text-muted-foreground">
                Turn YouTube into a curriculum. Organize, watch with intent, and measure what you learn.
              </p>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Product</p>
              <div className="flex flex-col gap-2 text-xs">
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
                <Link to="/library" className="text-muted-foreground hover:text-foreground">Library</Link>
                <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Account</p>
              <div className="flex flex-col gap-2 text-xs">
                {userId ? (
                  <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Open dashboard</Link>
                ) : (
                  <>
                    <Link to="/auth" search={{ mode: "signin" }} className="text-muted-foreground hover:text-foreground">Sign in</Link>
                    <Link to="/auth" search={{ mode: "signup" }} className="text-muted-foreground hover:text-foreground">Create account</Link>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Connect</p>
              <div className="flex flex-col gap-2 text-xs">
                <a href="mailto:hello@tubelearn.app" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Mail className="h-3 w-3" /> hello@tubelearn.app
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Github className="h-3 w-3" /> GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>© {new Date().getFullYear()} TubeLearn. Study, not scroll.</span>
            </div>
            <span className="tabular">v0.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-[var(--ember)]/15 text-[var(--ember)]">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-4 font-display text-xl tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
