import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "avatars";

/** Storage path used for a user's profile picture. */
export function avatarStoragePath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/** Center-crop to a square and downscale to `size`×`size` JPEG so uploads stay small and uniform. */
export async function normalizeAvatarImage(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image."))),
      "image/jpeg",
      0.85,
    ),
  );
}

// Signed URLs live 7 days; resolved per session and cached in memory only.
const signedUrlCache = new Map<string, string>();

export function invalidateAvatarUrl(path: string): void {
  signedUrlCache.delete(path);
}

/**
 * Resolves an avatar reference into a displayable URL.
 * Accepts either a bare storage path (`avatars` bucket) or a legacy full URL.
 */
export async function resolveAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cached = signedUrlCache.get(path);
  if (cached) return cached;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data) {
    console.warn("[avatar] signed url failed", error?.message);
    return null;
  }
  signedUrlCache.set(path, data.signedUrl);
  return data.signedUrl;
}
