import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_video",
  title: "Get video details",
  description: "Get one saved video's full detail: progress, notes, AI summary, and study segments.",
  inputSchema: { videoId: z.string().uuid().describe("Video id from list_videos.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ videoId }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to read a video.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("videos")
      .select("id,youtube_id,title,channel,category_id,completed,watched_seconds,duration_seconds,last_position_seconds,notes,summary,segments,added_at,last_watched_at")
      .eq("id", videoId)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("No video found with that id.");

    const rawSegments = Array.isArray(data.segments) ? (data.segments as unknown[]) : [];
    const video = {
      id: String(data.id),
      title: String(data.title ?? ""),
      channel: String(data.channel ?? ""),
      url: `https://www.youtube.com/watch?v=${String(data.youtube_id)}`,
      categoryId: data.category_id ? String(data.category_id) : null,
      completed: Boolean(data.completed),
      watchedSeconds: Number(data.watched_seconds ?? 0),
      durationSeconds: data.duration_seconds ? Number(data.duration_seconds) : null,
      lastPositionSeconds: Number(data.last_position_seconds ?? 0),
      notes: data.notes ? String(data.notes) : null,
      summary: data.summary ? String(data.summary) : null,
      addedAt: data.added_at ? String(data.added_at) : null,
      lastWatchedAt: data.last_watched_at ? String(data.last_watched_at) : null,
      segments: rawSegments.map((raw) => {
        const seg = (raw ?? {}) as Record<string, unknown>;
        return {
          name: typeof seg.name === "string" ? seg.name : "",
          startSec: Number(seg.startSec ?? 0),
          endSec: Number(seg.endSec ?? 0),
          watchedSeconds: Number(seg.watchedSeconds ?? 0),
        };
      }),
    };

    return {
      content: [{ type: "text", text: `${video.title} — ${video.channel}\n${video.url}\n${video.completed ? "Completed" : `Watched ${video.watchedSeconds}s`}${video.summary ? `\n\nSummary:\n${video.summary}` : ""}` }],
      structuredContent: { video },
    };
  },
});
