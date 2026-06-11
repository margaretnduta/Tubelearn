import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Lumen" },
      { name: "description", content: "Every video you've added, across all categories." },
    ],
  }),
  component: Library,
});

function Library() {
  const videos = useStore((s) => s.videos);
  const categories = useStore((s) => s.categories);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "todo" | "done" | "unsorted">("all");
  const [catFilter, setCatFilter] = useState<string | "all">("all");

  const filtered = videos
    .filter((v) => {
      if (filter === "done" && !v.completed) return false;
      if (filter === "todo" && v.completed) return false;
      if (filter === "unsorted" && v.categoryId) return false;
      if (catFilter !== "all" && v.categoryId !== catFilter) return false;
      if (query && !`${v.title} ${v.channel}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.addedAt - a.addedAt);

  return (
    <AppShell>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ember)]">Library</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Everything you've saved</h1>
          <p className="mt-2 text-sm text-muted-foreground tabular">
            {videos.length} {videos.length === 1 ? "video" : "videos"} total
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 100))}
              placeholder="Search your library…"
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            {(["all", "todo", "done", "unsorted"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-3 py-1.5 capitalize transition-colors ${
                  filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "todo" ? "To watch" : f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="font-display text-2xl">Nothing matches</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {videos.length === 0 ? "Add your first video from the top bar." : "Try clearing your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((v) => <VideoCard key={v.id} videoId={v.id} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}
