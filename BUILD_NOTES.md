# BUILD_NOTES.md — Autonomer Build der StammKundenMap

Live-Bericht eines autonomen Claude-Builds vom 2026-05-13 für die fiktive „Gartengestaltung Gaigg".

## Stack

- Next.js 16.2.6 (App Router, Turbopack default)
- React 19.2.4
- Tailwind CSS v4 + shadcn/ui (Radix Nova preset)
- Mapbox GL JS 3
- Three.js 0.184 + @lumaai/luma-web 0.2.2
- Zustand 5, Motion 12, Fuse.js 7, @tanstack/react-virtual 3
- Vitest 4, Playwright 1.60, jsdom 29

## Phasen-Log

### Phase 0 — Preflight & Scaffold

- **Stolperstein**: Ordnername `Experiment StammKundenMap` hat Leerzeichen + Großbuchstaben → `create-next-app` verweigert. **Fix**: Subfolder `stammkundenmap-gaigg/` (matched Repo-Name).
- **Stolperstein**: `@lumaai/luma-web@0.2.2` peer-depends auf `@types/three@^0.157.2`, wir nutzen `0.184.1`. **Fix**: `.npmrc` mit `legacy-peer-deps=true`.
- **Tailwind v4 Smoke-Test**: `npm run build` clean — kein PostCSS-Crash, kein Downgrade auf v3 nötig.
- **shadcn-Init**: Preset `nova` (Lucide + Geist) auf Radix-Base — passt zu unserer Geist-Font-Wahl.
- 20 shadcn-Komponenten installiert: button, input, badge, tabs, scroll-area, tooltip, dialog, sheet, sonner, separator, command, popover, skeleton, drawer, avatar, switch, select, toggle, toggle-group, textarea, input-group.
- Configs: playwright.config.ts (Chromium + iPhone-13), vitest.config.ts (jsdom + v8 coverage), prettier mit tailwindcss-plugin.

### Phase 1 — Datenfundament

_pending_

### Phase 2 — Theme & Foundation

_pending_

### Phase 3 — Map Foundation

_pending_

### Phase 4 — Cluster + Heatmap + Pins

_pending_

### Phase 5 — Sidebar

_pending_

### Phase 6 — Detail-Panel

_pending_

### Phase 7 — Polish & Microinteractions

_pending_

### Phase 8 — Quality Gates

_pending_

### Phase 9 — CI/CD & Docs

_pending_

### Phase 10 — Deploy & Verification

_pending_

## Final Stats

_pending_
