import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, TrendingUp, Clock, BookOpen, ChevronRight, Trash2, MoreVertical, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CategoryDialog } from "@/components/CategoryDialog";
import { VideoCard } from "@/components/VideoCard";
import { useStore, formatDuration, relativeTime } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TubeLearn" },
      { name: "description", content: "Your learning dashboard: categories, progress, and recent study." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const userId = useAuth((s) => s.currentUserId);
  const categories = useStore((s) => s.categories);
  const videos = useStore((s) => s.videos);
  const sessions = useStore((s) => s.sessions);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const [openCat, setOpenCat] = useState(false);

  if (!userId) return <Navigate to="/auth" search={{ mode: "signin", redirect: "/dashboard" }} />;

  const totalVideos = videos.length;
  const completed = videos.filter((v) => v.completed).length;
  const inProgress = videos.filter((v) => !v.completed && v.watchedSeconds > 0).length;
  const totalSeconds = videos.reduce((acc, v) => acc + v.watchedSeconds, 0);
  const completionPct = totalVideos ? Math.round((completed / totalVideos) * 100) : 0;

  const last7Days = sessions.filter((s) => Date.now() - s.at < 7 * 24 * 3600 * 1000);
  const weekSeconds = last7Days.reduce((a, s) => a + s.seconds, 0);

  const recentVideos = [...videos]
    .filter((v) => v.lastWatchedAt)
    .sort((a, b) => (b.lastWatchedAt ?? 0) - (a.lastWatchedAt ?? 0))
    .slice(0, 4);

  return (
    <AppShell>
      <section className="border-b border-border bg-grain">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 sm:flex sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--ember)]">
                Your study desk
              </p>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">
                {totalVideos === 0 ? (
                  <>Pick a subject.<br /><em className="text-muted-foreground">Make a start.</em></>
                ) : (
                  <>You've watched <span className="text-[var(--ember)]">{formatDuration(totalSeconds)}</span><br />
                  across <span className="tabular">{totalVideos}</span> {totalVideos === 1 ? "video" : "videos"}.</>
                )}
              </h1>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => setOpenCat(true)}
                className="flex items-center gap-1.5 rounded-md border border-foreground/20 bg-surface px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <Plus className="h-4 w-4" /> New category
              </button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            <Stat label="Videos" value={String(totalVideos)} icon={BookOpen} />
            <Stat label="In progress" value={String(inProgress)} icon={Clock} />
            <Stat label="Done" value={`${completed} · ${completionPct}%`} icon={TrendingUp} />
            <Stat label="This week" value={formatDuration(weekSeconds)} icon={ChevronRight} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Categories</h2>
            <p className="text-sm text-muted-foreground">Shelves for each subject you're studying.</p>
          </div>
          <button
            onClick={() => setOpenCat(true)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            + Add
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const items = videos.filter((v) => v.categoryId === c.id);
            const done = items.filter((v) => v.completed).length;
            const pct = items.length ? Math.round((done / items.length) * 100) : 0;
            return (
              <div key={c.id} className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lift">
                <div className="absolute inset-x-0 top-0 z-10 h-1" style={{ backgroundColor: c.color }} />

                <div className="absolute right-2 top-2 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Options for ${c.name}`}
                      className="grid h-8 w-8 place-items-center rounded-md bg-background/70 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-background hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem asChild>
                        <Link to="/category/$id" params={{ id: c.id }} className="cursor-pointer">
                          <ChevronRight className="mr-2 h-4 w-4" /> Open
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => {
                          if (confirm(`Delete "${c.name}"? Videos will move to Unsorted.`)) deleteCategory(c.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Link
                  to="/category/$id"
                  params={{ id: c.id }}
                  className="block p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="grid h-10 w-10 place-items-center rounded-lg font-display text-xl text-[oklch(0.2_0.02_60)]"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.icon}
                    </div>
                    <ChevronRight className="mr-10 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                  <h3 className="mt-4 font-display text-2xl leading-tight tracking-tight">{c.name}</h3>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-2 text-xs text-muted-foreground tabular">
                    <span>{items.length} {items.length === 1 ? "video" : "videos"} · {done} done</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </div>
                </Link>
              </div>
            );
          })}

          <button
            onClick={() => setOpenCat(true)}
            className="grid place-items-center gap-2 rounded-xl border border-dashed border-border bg-card/30 p-6 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm">New category</span>
          </button>
        </div>
      </section>

      {recentVideos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl tracking-tight">Pick up where you left off</h2>
              <p className="text-sm text-muted-foreground">Last opened {relativeTime(recentVideos[0].lastWatchedAt!)}.</p>
            </div>
            <Link to="/library" className="text-sm text-muted-foreground hover:text-foreground">
              All videos →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentVideos.map((v) => <VideoCard key={v.id} videoId={v.id} />)}
          </div>
        </section>
      )}

      {totalVideos === 0 && (
        <section className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="font-display text-2xl tracking-tight">Add your first video</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste any YouTube link from the top bar. We'll pull the title, channel, and thumbnail —
              you sort it into a category and start studying.
            </p>
          </div>
        </section>
      )}

      <CategoryDialog open={openCat} onOpenChange={setOpenCat} />
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 font-display text-3xl tracking-tight tabular">{value}</div>
    </div>
  );
}
