import { useEffect, useState } from "react";
import { Download, Check, Share, Plus, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton({
  className,
  label = "Install app",
}: {
  className?: string;
  label?: string;
}) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent || "";
    const iosLike = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    setIsIos(iosLike);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
      } catch {
        // ignore
      } finally {
        setDeferred(null);
      }
      return;
    }
    // No native prompt available — show iOS instructions or generic fallback
    setShowIosSheet(true);
  };

  if (installed) {
    return (
      <div
        className={
          className ??
          "inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground"
        }
      >
        <Check className="h-4 w-4 text-[var(--ember)]" /> App installed
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-md bg-[var(--ember)] px-5 py-3 text-sm font-medium text-[oklch(0.2_0.02_60)] transition-opacity hover:opacity-90"
        }
      >
        <Download className="h-4 w-4" /> {label}
      </button>

      {showIosSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowIosSheet(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-display text-2xl tracking-tight">Install TubeLearn</h3>
              <button
                aria-label="Close"
                onClick={() => setShowIosSheet(false)}
                className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isIos ? (
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-foreground">1</span>
                  <span>Tap the <Share className="inline h-3.5 w-3.5" /> <strong className="text-foreground">Share</strong> button in Safari.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-foreground">2</span>
                  <span>Scroll and choose <Plus className="inline h-3.5 w-3.5" /> <strong className="text-foreground">Add to Home Screen</strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-foreground">3</span>
                  <span>Tap <strong className="text-foreground">Add</strong> — TubeLearn launches from your home screen.</span>
                </li>
              </ol>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Your browser hasn't offered an install prompt yet. Try one of these:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li><strong className="text-foreground">Chrome / Edge:</strong> open the address bar menu and choose <em>Install app</em>.</li>
                  <li><strong className="text-foreground">Android:</strong> tap the browser menu → <em>Add to Home screen</em>.</li>
                  <li><strong className="text-foreground">Desktop:</strong> look for the install icon in the address bar.</li>
                </ul>
                <p className="text-xs">Tip: visit the site once or twice — browsers gate install prompts until you've engaged with the page.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
