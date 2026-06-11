import { Link } from "@tanstack/react-router";
import { Check, Clock } from "lucide-react";
import { useStore, formatDuration, relativeTime } from "@/lib/store";

export function VideoCard({ videoId }: { videoId: string }) {
  const video = useStore((s) => s.videos.find((v) => v.id === videoId));
  const category = useStore((s) =>
    video?.categoryId ? s.categories.find((c) => c.id === video.categoryId) : null,
  );
  const toggleComplete = useStore((s) => s.toggleComplete);

  if (!video) return null;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lift">
      <Link
        to="/video/$id"
        params={{ id: video.id }}
        className="block aspect-video w-full overflow-hidden bg-muted"
      >
        <img
          src={video.thumbnail}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {video.completed && (
          <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[var(--moss)] text-background">
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>
        )}
        {video.watchedSeconds > 0 && (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-6 text-[10px] text-white tabular">
            <Clock className="h-3 w-3" />
            {formatDuration(video.watchedSeconds)} logged
          </div>
        )}
      </Link>

      <div className="space-y-2 p-3">
        <Link to="/video/$id" params={{ id: video.id }}>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-[var(--ember)]">
            {video.title}
          </h3>
        </Link>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{video.channel}</span>
          <span className="tabular shrink-0">{relativeTime(video.addedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          {category ? (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Unsorted</span>
          )}
          <button
            onClick={(e) => { e.preventDefault(); toggleComplete(video.id); }}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
              video.completed
                ? "border-[var(--moss)] text-[var(--moss)]"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {video.completed ? "Done" : "Mark done"}
          </button>
        </div>
      </div>
    </div>
  );
}
