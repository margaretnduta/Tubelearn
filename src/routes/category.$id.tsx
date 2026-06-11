import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { AddVideoDialog } from "@/components/AddVideoDialog";
import { useStore, formatDuration } from "@/lib/store";

export const Route = createFileRoute("/category/$id")({
  component: CategoryPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Category not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-[var(--ember)]">← Back to dashboard</Link>
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

function CategoryPage() {
  const { id } = Route.useParams();
  const category = useStore((s) => s.categories.find((c) => c.id === id));
  const videos = useStore((s) => s.videos.filter((v) => v.categoryId === id));
  const deleteCategory = useStore((s) => s.deleteCategory);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "title" | "progress">("recent");
  const [openAdd, setOpenAdd] = useState(false);

  if (!category) throw notFound();

  const filtered = videos
    .filter((v) => v.title.toLowerCase().includes(query.toLowerCase()) || v.channel.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "progress") return b.watchedSeconds - a.watchedSeconds;
      return b.addedAt - a.addedAt;
    });

  const done = videos.filter((v) => v.completed).length;
  const pct = videos.length ? Math.round((done / videos.length) * 100) : 0;
  const totalWatched = videos.reduce((a, v) => a + v.watchedSeconds, 0);

  return (
    <AppShell>
      <section className="border-b border-border" style={{ background: `linear-gradient(180deg, color-mix(in oklch, ${category.color} 12%, transparent), transparent)` }}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
          <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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

          {/* progress bar */}
          <div className="mt-8 max-w-xl">
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular">
              <span>{done} of {videos.length} complete · {formatDuration(totalWatched)} watched</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: category.color }} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 100))}
              placeholder="Search this shelf…"
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="recent">Recently added</option>
            <option value="title">Title A→Z</option>
            <option value="progress">Most watched</option>
          </select>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--ember)] px-3 py-2 text-sm font-medium text-[oklch(0.2_0.02_60)]"
          >
            <Plus className="h-4 w-4" /> Add video
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="font-display text-2xl">Nothing here yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {videos.length === 0
                ? "Paste a YouTube link to fill this shelf."
                : "No videos match your search."}
            </p>
            {videos.length === 0 && (
              <button
                onClick={() => setOpenAdd(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                <Plus className="h-4 w-4" /> Add the first one
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((v) => <VideoCard key={v.id} videoId={v.id} />)}
          </div>
        )}
      </section>

      <AddVideoDialog open={openAdd} onOpenChange={setOpenAdd} defaultCategoryId={category.id} />
    </AppShell>
  );
}
