import { useState } from "react";
import { useStore, PALETTE } from "@/lib/store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ICONS = ["◐", "◇", "✦", "▲", "●", "✶", "❖", "✺", "✿", "☼"];

export function CategoryDialog({ open, onOpenChange }: Props) {
  const addCategory = useStore((s) => s.addCategory);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PALETTE[0].swatch);
  const [icon, setIcon] = useState(ICONS[0]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCategory({
      name: name.trim().slice(0, 60),
      description: description.trim().slice(0, 200),
      color,
      icon,
    });
    setName(""); setDescription("");
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-lift"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl tracking-tight">New category</h2>
          <p className="text-sm text-muted-foreground">A shelf for a single subject of study.</p>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Linear Algebra, German A2, History of Rome…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Optional — what are you trying to learn here?"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
            />
          </label>

          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Color</span>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => setColor(p.swatch)}
                  aria-label={p.name}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    color === p.swatch ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: p.swatch }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Glyph</span>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`grid h-8 w-8 place-items-center rounded-md border text-base ${
                    icon === i ? "border-foreground bg-accent" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button type="submit" disabled={!name.trim()} className="rounded-md bg-[var(--ember)] px-4 py-1.5 text-sm font-medium text-[oklch(0.2_0.02_60)] disabled:opacity-40">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
