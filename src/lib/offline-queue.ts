// Durable offline mutation queue.
// Every Supabase write goes through `enqueue()`. If the network call fails or
// the browser is offline, the mutation is persisted to localStorage and
// replayed on `online` or via periodic flush. Ordering is preserved per-table.
import { supabase } from "@/integrations/supabase/client";

export type MutationOp =
  | { kind: "insert"; table: string; values: Record<string, unknown> }
  | { kind: "upsert"; table: string; values: Record<string, unknown>; onConflict?: string }
  | { kind: "update"; table: string; values: Record<string, unknown>; match: Record<string, unknown> }
  | { kind: "delete"; table: string; match: Record<string, unknown> };

interface QueuedItem {
  id: string;
  op: MutationOp;
  attempts: number;
  queuedAt: number;
}

const KEY = "tubelearn-sync-queue-v1";
let flushing = false;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function readQueue(): QueuedItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedItem[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota — drop silently */
  }
  listeners.forEach((l) => l());
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function execute(op: MutationOp): Promise<{ error: unknown }> {
  // Runtime table names — bypass generated table-name typing.
  const t = (supabase.from as unknown as (n: string) => {
    insert: (v: unknown) => Promise<{ error: unknown }>;
    upsert: (v: unknown, o?: { onConflict?: string }) => Promise<{ error: unknown }>;
    update: (v: unknown) => { eq: (k: string, v: unknown) => unknown };
    delete: () => { eq: (k: string, v: unknown) => unknown };
  })(op.table);
  if (op.kind === "insert") return await t.insert(op.values);
  if (op.kind === "upsert") return await t.upsert(op.values, op.onConflict ? { onConflict: op.onConflict } : undefined);
  if (op.kind === "update") {
    let q: unknown = t.update(op.values);
    for (const [k, v] of Object.entries(op.match)) q = (q as { eq: (k: string, v: unknown) => unknown }).eq(k, v);
    return await (q as Promise<{ error: unknown }>);
  }
  let q: unknown = t.delete();
  for (const [k, v] of Object.entries(op.match)) q = (q as { eq: (k: string, v: unknown) => unknown }).eq(k, v);
  return await (q as Promise<{ error: unknown }>);
}

/** Fire an intended mutation. Runs immediately when online; queues on failure. */
export function enqueue(op: MutationOp) {
  if (!isBrowser()) return;
  const online = navigator.onLine !== false;
  if (online) {
    execute(op)
      .then((r) => {
        if (r.error) persist(op);
      })
      .catch(() => persist(op));
  } else {
    persist(op);
  }
}

function persist(op: MutationOp) {
  const q = readQueue();
  q.push({ id: newId(), op, attempts: 0, queuedAt: Date.now() });
  writeQueue(q);
}

/** Attempt to drain the queue. Safe to call at any time. */
export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  if (!isBrowser() || flushing || navigator.onLine === false) {
    return { flushed: 0, remaining: readQueue().length };
  }
  flushing = true;
  let flushed = 0;
  try {
    let q = readQueue();
    while (q.length > 0) {
      const item = q[0];
      const res = await execute(item.op).catch((e) => ({ error: e }));
      if (res && (res as { error?: unknown }).error) {
        // Increment attempts; drop after 10 failures to avoid poison-pill loops.
        item.attempts += 1;
        if (item.attempts >= 10) {
          console.warn("[offline-queue] dropping poison item", item);
          q.shift();
        } else {
          // Stop draining — likely still offline or server error. Persist attempt count.
          q[0] = item;
          writeQueue(q);
          break;
        }
      } else {
        q.shift();
        flushed += 1;
      }
      writeQueue(q);
      q = readQueue();
    }
  } finally {
    flushing = false;
  }
  return { flushed, remaining: readQueue().length };
}

export function pendingCount(): number {
  return readQueue().length;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Wire up automatic flush on connectivity return + periodic retry. */
export function initOfflineQueue() {
  if (!isBrowser()) return;
  window.addEventListener("online", () => {
    void flushQueue();
  });
  // Best-effort periodic drain in case 'online' didn't fire reliably.
  setInterval(() => {
    if (navigator.onLine !== false && pendingCount() > 0) void flushQueue();
  }, 30_000);
  // Initial drain shortly after boot.
  setTimeout(() => {
    if (navigator.onLine !== false) void flushQueue();
  }, 2000);
}
