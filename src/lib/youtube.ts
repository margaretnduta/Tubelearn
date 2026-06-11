export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Bare 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") {
        const v = url.searchParams.get("v");
        return v && /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
      }
      const parts = url.pathname.split("/").filter(Boolean);
      // /embed/ID, /shorts/ID, /live/ID, /v/ID
      if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
        const id = parts[1];
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    // not a URL
  }
  return null;
}

export function thumbnailUrl(videoId: string, quality: "hq" | "mq" | "max" = "hq") {
  const q = quality === "max" ? "maxresdefault" : quality === "mq" ? "mqdefault" : "hqdefault";
  return `https://img.youtube.com/vi/${videoId}/${q}.jpg`;
}

export interface OEmbedResult {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
}

export async function fetchOEmbed(videoId: string): Promise<OEmbedResult | null> {
  const url = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return {
      title: data.title ?? "Untitled",
      author_name: data.author_name ?? "Unknown channel",
      author_url: data.author_url ?? "",
      thumbnail_url: data.thumbnail_url ?? thumbnailUrl(videoId),
    };
  } catch {
    return null;
  }
}
