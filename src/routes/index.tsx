import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GraduationCap, Layers, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TubeLearn — Turn YouTube into deliberate study" },
      { name: "description", content: "Organize YouTube videos into learning categories, track minutes watched, and complete subjects with intention." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const userId = useAuth((s) => s.currentUserId);

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
          <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-md bg-[var(--ember)] px-5 py-3 text-sm font-medium text-[oklch(0.2_0.02_60)]">
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/auth" search={{ mode: "signin" }} className="rounded-md border border-border bg-card px-5 py-3 text-sm font-medium">
            I already have one
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-3 sm:px-8">
        <Feature icon={Layers} title="Categories" body="Create shelves per subject. Paste any YouTube link and sort it in." />
        <Feature icon={Clock} title="Minutes tracked" body="Every session counts. See exactly how long you've spent on each topic." />
        <Feature icon={CheckCircle2} title="New → In Progress → Done" body="Each video has a real state. Finish the shelf, finish the subject." />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground sm:px-8">
          TubeLearn — turning YouTube into deliberate study.
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
