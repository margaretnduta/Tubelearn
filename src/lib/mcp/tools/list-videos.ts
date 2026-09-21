import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_videos",
  title: "List videos",
  description: "List the signed-in user's saved YouTube study videos, optionally filtered by category, status, or search text.",
  inputSchema: {
    categoryId: z.string().uuid().optional().describe("Only videos in this category."),
    status: z.enum(["all", "new", "in_progress", "done"]).default("all").describe("Progress filter."),
    search: z.string().trim().max(120).optional().describe("Match against title or channel."),
    limit: z.number().int().min(1).max(100).default(25).describe("Maximum videos to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ categoryId, status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to list your videos.");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("videos")
      .select("id,youtube_id,title,channel,category_id,completed,watched_seconds,duration_seconds,last_watched_at")
      .order("added_at", { ascending: false })
      .limit(limit);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (search) query = query.or(`title.ilike.%${search}%,channel.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    const videos = (data ?? [])
      .map((v) => ({
        id: String(v.id),
        title: String(v.title ?? ""),
        channel: String(v.channel ?? ""),
        url: `https://www.youtube.com/watch?v=${String(v.youtube_id)}`,
        categoryId: v.category_id ? String(v.category_id) : null,
        completed: Boolean(v.completed),
        watchedSeconds: Number(v.watched_seconds ?? 0),
        durationSeconds: v.duration_seconds ? Number(v.duration_seconds) : null,
        lastWatchedAt: v.last_watched_at ? String(v.last_watched_at) : null,
      }))
      .filter((v) =>
        status === "done" ? v.completed
        : status === "in_progress" ? !v.completed && v.watchedSeconds > 0
        : status === "new" ? !v.completed && v.watchedSeconds === 0
        : true,
      );

    return {
      content: [{ type: "text", text: videos.length ? videos.map((v) => `${v.completed ? "[done]" : "[open]"} ${v.title} — ${v.channel} (${v.id})`).join("\n") : "No matching videos." }],
      structuredContent: { videos },
    };
  },
});
