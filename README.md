# TubeLearn

**Study, not scroll.** TubeLearn turns YouTube into a deliberate learning tool: paste any video URL, file it under your own subject categories, and track real progress as you watch.

> Live: https://studyflow-tube.lovable.app

---

## What it does

- **Organize by category.** Create shelves per subject (e.g. *Firebase*, *Design*, *Spanish*) and drop YouTube videos into them.
- **Track real progress.** Each video moves through **New → In Progress → Done**, with watch-time recorded per session.
- **Browse & play.** Click a category to see every video in it, grouped by status. Click a video to open the integrated YouTube player.
- **Manage your library.** Edit a video's category or delete it at any time.
- **Installable.** Add TubeLearn to your phone's home screen and launch it full-screen like a native app.

---

## Install on your device

TubeLearn is a Progressive Web App (PWA). It runs in any modern browser and can be installed directly to your device — no app store required.

### Android / Chrome / Edge (desktop or mobile)
1. Open the live site in Chrome or Edge.
2. Tap the browser menu (⋮) and choose **Install app** / **Add to Home screen**, or click the install icon in the address bar.
3. Confirm. TubeLearn opens in its own window with no browser chrome.

The in-app **"Install app"** button on the landing page also triggers the native install prompt when your browser is ready.

### iOS / iPadOS Safari
Safari does not fire an install prompt. Tap the **Install app** button — it opens a guided sheet showing:
1. Tap the **Share** button in Safari.
2. Choose **Add to Home Screen**.
3. Tap **Add** — the TubeLearn icon appears on your home screen.

### Desktop Safari / Firefox
These browsers do not currently support PWA install. Use Chrome or Edge on desktop, or pin the tab.
YES N/B SAFARI AND FIREFOX 
---

## Tech stack

- **Framework:** TanStack Start v1 (React 19 + Vite 7, SSR-capable, edge-runtime targeted)
- **Routing:** TanStack Router (file-based, in `src/routes/`)
- **Data:** TanStack Query + Zustand store (`src/lib/store.ts`)
- **Styling:** Tailwind CSS v4 with semantic design tokens in `src/styles.css`
- **UI primitives:** shadcn/ui (Radix)
- **PWA:** `public/manifest.webmanifest` + minimal guarded service worker (`public/sw.js`, registered via `src/lib/register-sw.ts`)
- **Auth:** Local auth scaffold in `src/lib/auth.ts` (swap for Lovable Cloud / Supabase as needed)

---

## Project structure

```
src/
  routes/
    __root.tsx           # App shell, head tags, PWA meta, SW registration
    index.tsx            # Landing page + Install CTA
    dashboard.tsx        # User dashboard (categories grid)
    category.$id.tsx     # Category detail (videos grouped by status)
    video.$id.tsx        # Video player + edit/delete controls
    library.tsx          # Full library view
    auth.tsx             # Sign-in / sign-up
  components/
    AppShell.tsx         # Header, mobile sheet nav, footer
    InstallAppButton.tsx # PWA install button (beforeinstallprompt + iOS sheet)
    VideoCard.tsx, CategoryDialog.tsx, AddVideoDialog.tsx, ...
  lib/
    store.ts             # Zustand: videos, categories
    auth.ts              # Auth state
    register-sw.ts       # Guarded service worker registration
    youtube.ts           # URL → video id parsing
public/
  manifest.webmanifest   # PWA manifest
  sw.js                  # Minimal pass-through service worker
  icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico
```

---

## Local development

```bash
bun install
bun run dev
```

Then open the local URL printed in the terminal.

> **Note on PWA installability in development:** the service worker is intentionally **not** registered in dev or in Lovable's preview iframe (it would cache stale content). To test the install flow, use the published deployment.

---

## Building for production

The project is configured to build automatically on Lovable. Manually:

```bash
bun run build
```

The output targets an edge runtime (Cloudflare Workers / similar). Do not import Node-only packages in server functions.

---

## Key features in code

- **Install flow:** `src/components/InstallAppButton.tsx` captures the browser's `beforeinstallprompt` event, calls `prompt()` on click, and falls back to a guided iOS instruction sheet.
- **Service worker:** `public/sw.js` is a minimal pass-through worker (no caching). Its only job is to satisfy Chromium's installability criteria so the native install prompt appears.
- **Registration guard:** `src/lib/register-sw.ts` refuses to register the SW in dev, in iframes, on Lovable preview hostnames, or when `?sw=off` is in the URL — preventing stale-cache issues during development.
- **Mobile UX:** `AppShell.tsx` uses an off-canvas `Sheet` for mobile navigation and respects `env(safe-area-inset-*)` so the layout works around notches and home indicators.

---

## Roadmap ideas

- Cloud sync of categories and videos (Lovable Cloud)
- Background sync of watch-time
- Playlist import
- Spaced-repetition prompts for finished videos

---

## License

Built with [Lovable](https://lovable.dev). Use it, fork it, ship your own.
