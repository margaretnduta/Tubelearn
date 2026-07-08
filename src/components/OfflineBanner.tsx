import { WifiOff, CloudOff, Zap } from "lucide-react";
import { useNetworkStatus, usePendingSyncCount } from "@/hooks/use-network-status";

export function OfflineBanner() {
  const net = useNetworkStatus();
  const pending = usePendingSyncCount();

  if (net.online && !net.slow && pending === 0) return null;

  const label = !net.online
    ? { icon: WifiOff, text: `You're offline${pending > 0 ? ` — ${pending} change${pending === 1 ? "" : "s"} will sync when you reconnect` : " — your library is still available"}`, tone: "bg-[oklch(0.5_0.15_25)] text-white" }
    : net.slow
      ? { icon: Zap, text: "Slow connection — pausing heavy loads", tone: "bg-[oklch(0.55_0.12_60)] text-white" }
      : { icon: CloudOff, text: `Syncing ${pending} pending change${pending === 1 ? "" : "s"}…`, tone: "bg-muted text-foreground" };

  const Icon = label.icon;
  return (
    <div className={`sticky top-16 z-30 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${label.tone}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label.text}</span>
    </div>
  );
}
