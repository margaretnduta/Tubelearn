import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List the signed-in user's TubeLearn study categories with video counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to list your categories.");
    const supabase = supabaseForUser(ctx);
    const [cats, vids] = await Promise.all([
      supabase.from("categories").select("id,name,description,color,icon,created_at").order("created_at"),
      supabase.from("videos").select("id,category_id,completed"),
    ]);
    if (cats.error) throw new ToolError(cats.error.message);
    if (vids.error) throw new ToolError(vids.error.message);

    const categories = (cats.data ?? []).map((c) => {
      const mine = (vids.data ?? []).filter((v) => v.category_id === c.id);
      return {
        id: String(c.id),
        name: String(c.name ?? ""),
        description: c.description ? String(c.description) : null,
        videoCount: mine.length,
        completedCount: mine.filter((v) => v.completed).length,
      };
    });

    return {
      content: [{ type: "text", text: categories.length ? categories.map((c) => `${c.name} — ${c.completedCount}/${c.videoCount} done (${c.id})`).join("\n") : "No categories yet." }],
      structuredContent: { categories },
    };
  },
});
