import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ videoRowId: z.string().uuid(), youtubeId: z.string().min(3) });

// --- transcript fetching (best-effort) ---
async function listTracks(videoId: string): Promise<{ lang: string; name: string }[]> {
  try {
    const res = await fetch(`https://video.google.com/timedtext?type=list&v=${videoId}`);
    if (!res.ok) return [];
    const xml = await res.text();
    const tracks: { lang: string; name: string }[] = [];
    const re = /<track[^>]*lang_code="([^"]+)"[^>]*name="([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) tracks.push({ lang: m[1], name: m[2] });
    return tracks;
  } catch { return []; }
}

async function fetchTrack(videoId: string, lang: string, name = ""): Promise<string> {
  try {
    const qs = new URLSearchParams({ v: videoId, lang, ...(name ? { name } : {}) });
    const res = await fetch(`https://video.google.com/timedtext?${qs.toString()}`);
    if (!res.ok) return "";
    const xml = await res.text();
    // strip tags, decode entities
    const text = xml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    return text;
  } catch { return ""; }
}

async function fetchTranscript(videoId: string): Promise<{ text: string; lang: string | null }> {
  const tracks = await listTracks(videoId);
  if (tracks.length === 0) return { text: "", lang: null };
  // prefer English, else first
  const pref = tracks.find((t) => t.lang.startsWith("en")) ?? tracks[0];
  const text = await fetchTrack(videoId, pref.lang, pref.name);
  return { text, lang: pref.lang };
}

export const summarizeVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    // fetch the row for title/channel context + verify ownership
    const { data: row, error: rowErr } = await supabase
      .from("videos").select("id, title, channel").eq("id", data.videoRowId).eq("user_id", userId).maybeSingle();
    if (rowErr || !row) throw new Error("Video not found");

    const { text: transcript, lang } = await fetchTranscript(data.youtubeId);
    const trimmed = transcript.slice(0, 60_000); // safety cap

    const gateway = createLovableAiGatewayProvider(key);
    const sys = [
      "You summarize YouTube videos for a learner.",
      "Always respond in English (auto-translate from any source language).",
      "Structure the summary as:",
      "1) One-paragraph overview (2-3 sentences).",
      "2) 4-7 bullet 'Key takeaways'.",
      "3) 2-3 bullet 'What to review'.",
      "Be concise. No filler.",
    ].join(" ");

    const userMsg = trimmed
      ? `Title: ${row.title}\nChannel: ${row.channel}\nTranscript language: ${lang ?? "unknown"}\n\nTranscript:\n${trimmed}`
      : `Title: ${row.title}\nChannel: ${row.channel}\n\n(No transcript was available for this video. Produce a best-effort summary from the title and channel context, and note at the end that no captions were available.)`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: sys,
      prompt: userMsg,
    });

    await supabase.from("videos").update({ summary: text }).eq("id", data.videoRowId).eq("user_id", userId);
    return { summary: text, hadTranscript: !!trimmed };
  });
