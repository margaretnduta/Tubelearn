# Roadmap

## Open
- [ ] MCP server integration (agent tools) — partially built in an earlier turn: tool files exist (`src/lib/mcp/tools/*`, `src/lib/mcp/supabase.ts`), but `@lovable.dev/mcp-js` server registration, Vite plugin wiring, OAuth consent flow, manifest extraction, and publish are still pending. Blocked on user go-ahead (work pivoted to account/profile features).

## Done
- [x] Full project audit — report delivered.
- [x] "+" inline new-category button in the Add Video dialog (auto-selects the new category). Verified in preview.
- [x] Profile pictures: avatars storage bucket + RLS, client-side square-crop upload, remove, display in header/mobile menu/profile page; "Member since" on profile; fixed hard-refresh auth race on dashboard/library/category/profile pages so signed-in users stay put. Verified signed-in in preview (upload, persist across reload, remove, no console errors).
