import { useEffect, useState } from "react";
import { resolveAvatarUrl } from "@/lib/avatar";

/** Profile picture with initials fallback. `path` is an avatars-bucket path or a full URL. */
export function Avatar({
  path,
  name,
  className = "",
}: {
  path?: string | null;
  name: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    resolveAvatarUrl(path).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [path]);

  if (url) {
    return <img src={url} alt={`${name}'s profile`} className={`${className} shrink-0 object-cover`} />;
  }
  const initials =
    (name.trim().split(/\s+/).map((w) => w[0]).join("") || "?").slice(0, 2).toUpperCase();
  return (
    <div
      className={`${className} grid shrink-0 select-none place-items-center bg-muted font-display text-muted-foreground`}
      aria-label={`${name}'s profile`}
    >
      {initials}
    </div>
  );
}
