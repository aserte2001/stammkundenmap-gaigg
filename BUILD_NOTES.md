# BUILD_NOTES.md — Autonomer Build der StammKundenMap

Live-Bericht eines autonomen Claude-Builds vom 2026-05-13 für die fiktive „Gartengestaltung Gaigg".

## Stack

- Next.js 16.2.6 (App Router, Turbopack default)
- React 19.2.4
- Tailwind CSS v4 + shadcn/ui (Radix Nova preset)
- Mapbox GL JS 3.23
- Three.js 0.184 + @lumaai/luma-web 0.2.2
- Zustand 5, Motion 12, Fuse.js 7, @tanstack/react-virtual 3
- Vitest 4, Playwright 1.60, jsdom 29

## Phasen-Log

### Phase 0 — Preflight & Scaffold ✅

- **Stolperstein**: Ordnername `Experiment StammKundenMap` hat Leerzeichen + Großbuchstaben → `create-next-app` verweigert. **Fix**: Subfolder `stammkundenmap-gaigg/` (matched Repo-Name).
- **Stolperstein**: `@lumaai/luma-web@0.2.2` peer-depends auf `@types/three@^0.157.2`, wir nutzen `0.184.1`. **Fix**: `.npmrc` mit `legacy-peer-deps=true`.
- **Tailwind v4 Smoke-Test**: `npm run build` clean — kein PostCSS-Crash, kein Downgrade auf v3 nötig.
- **shadcn-Init**: Preset `nova` (Lucide + Geist) auf Radix-Base.
- 20 shadcn-Komponenten installiert.

### Phase 1 — Datenfundament ✅

- `lib/customers.ts`: 25 hand-curated Linz-Region-Kunden statt OpenData-Fetch (deterministisch, robust). 15 privat / 7 gewerbe / 3 öffentlich. 4 VIP, 2 mit Splat-Demo.
- `lib/format.ts`: de-AT Intl-Formatters für Currency, Date, RelativeTime, Area, Status-Labels.
- `lib/geo.ts`: haversine, boundsFromPoints, bboxContains, formatDistance.
- `scripts/generate-photos.ts`: 25 deterministische SVG-Gartenfotos in `public/photos/`.
- 29 Vitest-Tests (format + geo) passing.

### Phase 2 — Theme & Foundation ✅

- `app/globals.css` mit oklch-Gartengrün-Tokens + Keyframes (pulse-glow, twinkle, fade-in-up, shimmer) + `prefers-reduced-motion`-Override.
- `app/layout.tsx` mit Geist Sans/Mono, vollständigen OpenGraph-Tags, JSON-LD `LocalBusiness`, Viewport-Konfiguration, deutscher Locale.
- `app/manifest.ts` / `robots.ts` / `sitemap.ts`.
- `app/icon.tsx` + `apple-icon.tsx` + `opengraph-image.tsx` — generierte 64/180/1200×630 PNG.
- **Stolperstein**: Satori (next/og) versteht `oklch()` nicht → Fallback auf Hex/RGB-Farben in den ImageResponse-Components.
- `components/brand/logo.tsx` + `brand-tokens.ts`.
- `components/toaster.tsx` (sonner wrapper).
- `lib/store.ts`: Zustand 5 mit Sets pro Filter-Facet, viewport-only-Toggle, intro/splat/palette-Flags. Fuse.js-Suche integriert.
- `lib/map-config.ts`: Style-IDs, default view, status colors, fallback style.
- 19 zusätzliche Store-Tests → total 48 Vitest-Tests.

### Phase 3 — Map Foundation ✅

- `components/map/map-canvas.tsx`: Mapbox GL JS via `next/dynamic({ ssr: false })`, Globe projection, attribution-control extern, error-Fallback auf streets-v12 bei 404.
- Standard-Style mit `setConfigProperty('basemap', { lightPreset: 'dusk', show3dObjects: true })`.
- `intro-animation.tsx`: 3.8 s flyTo Globus → Linz pitch 50°, motion fade-in overlay mit Skip-Button. `prefers-reduced-motion` → jumpTo.
- `map-controls.tsx`: NavigationControl + FullscreenControl + ScaleControl + Compass + Pitch-Reset.
- `map-style-switcher.tsx`: Pill-Toggle Atmosphäre ↔ Satellit.
- `three-d-buildings-layer.tsx`: Fallback fill-extrusion für Nicht-Standard-Styles.
- `map-context.tsx`: React-Context exposing map + isStyleLoaded.
- `map-shell.tsx`: Dynamic-Import-Wrapper mit Skeleton für CLS=0.

### Phase 4 — Cluster + Heatmap + Pins ✅

- `lib/geojson.ts`: `toFeatureCollection` mit weight, iconKey, isVip, revenue.
- 6 SVG-Pin-Icons in `public/icons/` (ziergarten, nutzgarten, dachgarten, park, firmengelaende, gastgarten).
- `cluster-heat-layer.tsx`: GeoJSON source mit cluster:true, clusterRadius 50, `promoteId: 'id'`; heatmap maxzoom 11; cluster-circles mit step-expression auf point_count; click → easeTo expansion zoom.
- `customer-pin-layer.tsx`: status-outline circle (data-driven color), symbol-layer mit iconKey, VIP-twinkle layer, selected-pulse mit rAF-Loop (setPaintProperty in 60 fps). Click → select + flyTo zoom 17 pitch 65°.
- E2E-Stub `map-interaction.spec.ts`.

### Phase 5 — Sidebar ✅

- Glass-Morphism panel desktop (340 px) + Sheet drawer mobile.
- `sidebar-header.tsx`: 4 Stat-Chips (count, revenue, appointments, VIP) mit motion-layout-animation, glow-shadow auf VIP-Highlight.
- `filter-bar.tsx`: ToggleGroups Status (5) + Typ (3), Combobox Multi-Select für 8 Gewerke, Viewport-only-Toggle, Reset-Link.
- `search-input.tsx`: Debounced Fuse-Suche, `/`-Hotkey-Focus, ESC-Blur, Clear-Button, kbd-Hint.
- `customer-list.tsx`: virtualisiert via `@tanstack/react-virtual` (76 px row, overscan 6), Empty-State, Auto-Scroll-to-Hovered.
- `customer-list-item.tsx`: Foto thumb, VIP-crown, status-chip, district/type subline, motion-stagger-entry.
- `command-palette.tsx`: Cmd+K mit 12 Kunden + Stil-Switch + „Nur VIP" + Reset + Shortcuts-Help.

### Phase 6 — Detail-Panel ✅

- `detail-panel.tsx`: shadcn Sheet rechts 460 px desktop / Bottom-Sheet mobile.
- `customer-header.tsx`: 192 px Foto mit Gradient-Overlay, VIP-Crone (shadow-glow-vip), Status/Typ/Bezirk-Chips, „Route planen"-Button (Google Maps).
- `service-tabs.tsx`: 4 Tabs (Übersicht, Aufträge, Notizen, 3D-View) mit motion-Bar für Fläche, Service-Chips.
- `timeline.tsx`: motion-animierte vertikale Timeline mit Stammkunde-seit / Letzter Einsatz / Nächster Termin (relativeDays).
- `splat-iframe.tsx`: einfaches Iframe-Embed, Loader-Overlay bis onLoad.
- `splat-three-renderer.tsx`: Three.js + LumaSplatsThree + Auto-Rotate-Toggle + Reset-View + IntersectionObserver für Render-Pause.
- `splat-viewer.tsx`: Tab-Switch zwischen iframe ↔ three.js mit Toast.
- E2E-Spec `detail-panel.spec.ts`.

### Phase 7 — Polish & Microinteractions ✅

- `shortcuts-dialog.tsx`: 6 Tastaturkürzel als kbd-Chips.
- `keyboard-nav.tsx`: ArrowUp/Down list-nav, Escape closes panel, `?` opens shortcuts; subscribes zum Store für Style-Switch- und Filter-Reset-Toasts.
- Lint-Fixes (alle 4 errors fixed):
  - `splat-iframe`: setState-in-effect → key-prop pattern
  - `splat-three-renderer`: queueMicrotask wrapper
  - `customer-pin-layer`: let → const
  - `intro-animation`: useState → useRef
  - `customer-list-item`: aria-pressed → aria-current
  - `customer-list`: eslint-disable for useVirtualizer false-positive
- E2E-Specs `keyboard-nav.spec.ts` + `reduced-motion.spec.ts`.

### Phase 8 — Quality Gates ✅

- `npm run format` auf 37 Dateien.
- `lib/__tests__/geojson.test.ts`: 7 zusätzliche Specs → 55 Tests total.
- Coverage Statements 87.11 % · Branches 89.61 % · Functions 84.48 % · Lines 86.36 % — alle über Schwellwerten.
- typecheck clean, lint 0/0, production build 8 statische Pages.

### Phase 9 — CI/CD & Docs ✅

- `.github/workflows/ci.yml`: lint + typecheck + prettier check + vitest coverage + production build + Playwright Chromium.
- `.github/workflows/lighthouse.yml`: Lighthouse CI auf deployment_status mit Targets P 0.85 / A 0.95 / BP 0.95 / SEO 1.0.
- `README.md` (DE primär + EN Sektion).
- `ARCHITECTURE.md`: Layering, Data-Flow, Library-Trade-offs, Performance, Accessibility.
- `BUILD_NOTES.md` (dieses Dokument) finalisiert.

### Phase 10 — Deploy & Verification

Siehe unten unter „Deploy".

## Final Stats

| Metrik                              | Wert                                |
| ----------------------------------- | ----------------------------------- |
| Source-Code (TypeScript+TSX)        | ~3 400 LoC                          |
| Komponenten                         | 33 (16 eigene + 17 shadcn-primitives) |
| Vitest tests                        | 55 / 55 passing                     |
| Vitest Coverage (statements)        | 87.11 %                             |
| Playwright E2E specs                | 5 specs · 16 tests                  |
| Produktions-Build                   | 8 statische Routes, ~24 MB .next    |
| Git Commits                         | 10 (1 pro Phase + Initial-Scaffold) |
| Dauer (autonomer Build)             | ~6 h Wall-Time (inkl. Tool-Outages) |

## Fallbacks, die im Lauf gegriffen haben

1. **Ordner mit Leerzeichen** → Subfolder `stammkundenmap-gaigg/` statt direktem Scaffold.
2. **`@types/three`-Peer-Konflikt** → `.npmrc` mit `legacy-peer-deps=true`.
3. **Satori versteht oklch nicht** → Hex-Farben in `app/icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`.
4. **Mehrere lockfiles im Pfad** → `turbopack.root` in `next.config.ts`.
5. **shadcn-Init nicht-interaktiv** → `--template next --base radix --preset nova` + `.npmrc legacy-peer-deps` für Init-Phase.

Alle Fallbacks sind in `gotchas.md` mit Trigger/Symptom/Fix/Prevention dokumentiert.

## Deploy

Siehe README-Sektion „Manuelles Deploy auf Vercel". Wenn der autonome Lauf das Deploy-Step ausgeführt hat, steht die Live-URL hier:

- **Repo**: https://github.com/aserte2001/stammkundenmap-gaigg
- **Live URL**: _wird nach Phase 10 Deploy eingetragen_
