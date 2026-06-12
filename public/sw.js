// Minimal service worker to satisfy installability criteria (beforeinstallprompt).
// Network-first for navigations; no aggressive caching.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through fetch handler. Required for installability on Chromium browsers.
  // We deliberately do not cache to avoid stale content across deploys.
  return;
});
