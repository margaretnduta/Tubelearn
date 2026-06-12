import { createFileRoute, Link, Navigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { AddVideoDialog } from "@/components/AddVideoDialog";
import { useStore, formatDuration, type Video } from "@/lib/store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/category/$id")({
  component: CategoryPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Category not found</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-[var(--ember)]">← Back to dashboard</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Couldn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </AppShell>
  ),
});

function bucket(v: Video): "new" | "progress" | "done" {
  if (v.completed) return "done";
  if (v.watchedSeconds > 0) return "progress";
  return "new";
}

function CategoryPage() {
  const userId = useAuth((s) => s.currentUserId);
  const { id } = Route.useParams();
  const category = useStore((s) => s.categories.find((c) => c.id === id));
  const videos = useStore((s) => s.videos.filter((v) => v.categoryId === id));
  const deleteCategory = useStore((s) => s.deleteCategory);
  const [openAdd, setOpenAdd] = useState(false);

  if (!userId) return <Navigate to="/auth" search={{ mode: "signin", redirect: `/category/${id}` }} />;
  if (!category) throw notFound();

  const buckets = {
    new: videos.filter((v) => bucket(v) === "new"),
    progress: videos.filter((v) => bucket(v) === "progress"),
    done: videos.filter((v) => bucket(v) === "done"),
  };

  const done = buckets.done.length;
  const pct = videos.length ? Math.round((done / videos.length) * 100) : 0;
  const totalWatched = videos.reduce((a, v) => a + v.watchedSeconds, 0);

  return (
    <AppShell>
      <section className="border-b border-border" style={{ background: `linear-gradient(180deg, color-mix(in oklch, ${category.color} 12%, transparent), transparent)` }}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
          <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl font-display text-3xl text-[oklch(0.2_0.02_60)]"
                style={{ backgroundColor: category.color }}
              >
                {category.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Category</p>
                <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">{category.name}</h1>
                {category.description && (
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{category.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenAdd(true)}
                className="flex items-center gap-1.5 rounded-md bg-[var(--ember)] px-3 py-2 text-sm font-medium text-[oklch(0.2_0.02_60)]"
              >
                <Plus className="h-4 w-4" /> Add video
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${category.name}"? Videos will move to Unsorted.`)) {
                    deleteCategory(category.id);
                    window.history.back();
                  }
                }}
                className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                aria-label="Delete category"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 max-w-xl">
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular">
              <span>{done} of {videos.length} complete · {formatDuration(totalWatched)} watched</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: category.color }} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 max-w-xl text-center text-xs">
            <Pill label="New" count={buckets.new.length} tone="text-foreground" />
            <Pill label="In Progress" count={buckets.progress.length} tone="text-[var(--ember)]" />
            <Pill label="Done" count={buckets.done.length} tone="text-[var(--moss)]" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-8">
        {videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="font-display text-2xl">Nothing here yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Paste a YouTube link to fill this shelf.</p>
            <button
              onClick={() => setOpenAdd(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              <Plus className="h-4 w-4" /> Add the first one
            </button>
          </div>
        ) : (
          <>
            <Bucket title="New" icon={Sparkles} videos={buckets.new} emptyText="No new videos." />
            <Bucket title="In Progress" icon={Clock} videos={buckets.progress} emptyText="No videos in progress." />
            <Bucket title="Done" icon={CheckCircle2} videos={buckets.done} emptyText="Nothing finished yet." />
          </>
        )}
      </section>

      <AddVideoDialog open={openAdd} onOpenChange={setOpenAdd} defaultCategoryId={category.id} />
    </AppShell>
  );
}

function Pill({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-display text-2xl tabular ${tone}`}>{count}</div>
    </div>
  );
}

function Bucket({
  title,
  icon: Icon,
  videos,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  videos: Video[];
  emptyText: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground tabular">· {videos.length}</span>
      </div>
      {videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => <VideoCard key={v.id} videoId={v.id} />)}
        </div>
      )}
    </div>
  );
}
