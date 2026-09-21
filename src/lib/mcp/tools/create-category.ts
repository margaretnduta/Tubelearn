import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_category",
  title: "Create category",
  description: "Create a new study category for the signed-in TubeLearn user.",
  inputSchema: {
    name: z.string().trim().min(1).max(60).describe("Category name."),
    description: z.string().trim().max(240).optional().describe("Optional short description."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ name, description }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to create a category.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: ctx.getUserId(),
        name,
        description: description ?? null,
        color: "oklch(0.72 0.15 60)",
        icon: "BookOpen",
      })
      .select("id,name,description")
      .single();
    if (error) throw new ToolError(error.message);
    const category = { id: String(data.id), name: String(data.name), description: data.description ? String(data.description) : null };
    return { content: [{ type: "text", text: `Created category "${category.name}".` }], structuredContent: { category } };
  },
});
