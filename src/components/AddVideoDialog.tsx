import { useState } from "react";
import { Loader2, Link2, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { parseYouTubeId, fetchOEmbed, thumbnailUrl } from "@/lib/youtube";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCategoryId?: string | null;
}

export function AddVideoDialog({ open, onOpenChange, defaultCategoryId = null }: Props) {
  const categories = useStore((s) => s.categories);
  const addVideo = useStore((s) => s.addVideo);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [thumb, setThumb] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setUrl(""); setTitle(""); setChannel(""); setThumb("");
    setResolved(null); setError(null); setCategoryId(defaultCategoryId);
  };

  const handleResolve = async (value: string) => {
    setUrl(value);
    const id = parseYouTubeId(value);
    if (!id) {
      setResolved(null);
      setError(value.length > 4 ? "Doesn't look like a YouTube link." : null);
      return;
    }
    setError(null);
    setLoading(true);
    setResolved(id);
    setThumb(thumbnailUrl(id));
    const meta = await fetchOEmbed(id);
    if (meta) {
      setTitle(meta.title);
      setChannel(meta.author_name);
      setThumb(meta.thumbnail_url);
    } else {
      setTitle("");
      setChannel("");
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolved) return;
    if (!title.trim()) {
      setError("Add a title so you can find this later.");
      return;
    }
    addVideo({
      youtubeId: resolved,
      title: title.trim().slice(0, 200),
      channel: channel.trim().slice(0, 100) || "Unknown channel",
      thumbnail: thumb || thumbnailUrl(resolved),
      categoryId,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-lift"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl tracking-tight">Add a video</h2>
          <p className="text-sm text-muted-foreground">Paste any YouTube link — we'll grab the details.</p>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              YouTube URL
            </span>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={url}
                onChange={(e) => handleResolve(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                maxLength={500}
                className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {resolved && !loading && (
                <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--moss)]" />
              )}
            </div>
            {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
          </label>

          {resolved && (
            <div className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3">
              <img
                src={thumb || thumbnailUrl(resolved)}
                alt=""
                className="h-20 w-32 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Video title"
                  maxLength={200}
                  className="w-full rounded border border-input bg-background px-2 py-1 text-sm font-medium"
                />
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="Channel name"
                  maxLength={100}
                  className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-muted-foreground"
                />
              </div>
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Category
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  categoryId === null
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Unsorted
              </button>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                    categoryId === c.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
          <button
            type="button"
            onClick={() => { reset(); onOpenChange(false); }}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!resolved}
            className="rounded-md bg-[var(--ember)] px-4 py-1.5 text-sm font-medium text-[oklch(0.2_0.02_60)] disabled:opacity-40"
          >
            Add to library
          </button>
        </div>
      </form>
    </div>
  );
}
