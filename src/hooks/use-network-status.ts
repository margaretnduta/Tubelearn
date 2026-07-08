import { useSyncExternalStore, useEffect, useState } from "react";
import { pendingCount, subscribe, flushQueue } from "@/lib/offline-queue";

interface NetInfo {
  online: boolean;
  slow: boolean;
  effectiveType: string | null;
  saveData: boolean;
}

interface NavigatorConnection {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (t: string, l: () => void) => void;
  removeEventListener?: (t: string, l: () => void) => void;
}

function read(): NetInfo {
  if (typeof navigator === "undefined") {
    return { online: true, slow: false, effectiveType: null, saveData: false };
  }
  const c = (navigator as unknown as { connection?: NavigatorConnection }).connection;
  const eff = c?.effectiveType ?? null;
  return {
    online: navigator.onLine !== false,
    slow: eff === "slow-2g" || eff === "2g",
    effectiveType: eff,
    saveData: !!c?.saveData,
  };
}

export function useNetworkStatus(): NetInfo {
  const [info, setInfo] = useState<NetInfo>(() => read());
  useEffect(() => {
    const update = () => setInfo(read());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const c = (navigator as unknown as { connection?: NavigatorConnection }).connection;
    c?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      c?.removeEventListener?.("change", update);
    };
  }, []);
  return info;
}

export function usePendingSyncCount(): number {
  return useSyncExternalStore(subscribe, pendingCount, () => 0);
}

export function useAutoFlushOnReconnect() {
  useEffect(() => {
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
}
