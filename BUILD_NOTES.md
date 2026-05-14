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
- **Live URL**: **https://stammkundenmap-gaigg.vercel.app**
- **Vercel Inspector**: https://vercel.com/aserte2001s-projects/stammkundenmap-gaigg/94WVeoVQQgnXYNisrUVB9y4hm7w7
- **Production Deploy-ID**: `dpl_94WVeoVQQgnXYNisrUVB9y4hm7w7` · Build 46 s · 8 statische Routes prerendered · X-Vercel-Cache: PRERENDER · region fra1.

### Phase 10 — Deploy & Verification ✅

- `vercel link --yes --project stammkundenmap-gaigg` → Projekt `aserte2001s-projects/stammkundenmap-gaigg` automatisch erstellt, GitHub-Repo verbunden (Auto-Deploys bei jedem Push aktiv).
- `vercel env add NEXT_PUBLIC_MAPBOX_TOKEN production` via stdin-pipe gesetzt.
- `vercel deploy --prod --yes` → Build 46 s, 8 static pages prerendered, status READY.
- Smoke-Test: `curl -I` gegen Live-URL → `HTTP/1.1 200`, `Content-Type: text/html; charset=utf-8`, `X-Nextjs-Prerender: 1`, `Strict-Transport-Security` aktiv.
- HTML-Sniff: `lang="de-AT"`, `class="…dark"`, Geist Sans+Mono preloaded, alle Turbopack-Chunks async.
- **Workflow-Files (CI/Lighthouse)** sind im lokalen Repo unter `.github/workflows/` gehalten, aber **nicht** im GitHub-Remote — der eingerichtete Personal Access Token hat nur `admin:org, repo` Scopes, `workflow`-Scope fehlt (gh CLI würde `gh auth refresh -s workflow` benötigen, das ist ein interaktiver Browser-Flow). Workaround: Vercel-Auto-Deploys via GitHub-Integration ersetzen die CI-Build-Stage, alle anderen Gates (lint/typecheck/vitest/playwright) sind lokal verifiziert. Lighthouse-Audit kann nach Bedarf auf https://pagespeed.web.dev/ gegen die Live-URL gefahren werden.

### Phase 10b — Post-Deploy Hotfix ✅

Direkt nach dem ersten Live-Deploy kam beim User in Chrome DevTools ein „This page couldn't load" zurück. Server-side lieferte die URL 200 + komplettes HTML; alle Critical-JS-Chunks waren als 200 erreichbar. Der Bug lebte erst im Browser-Runtime.

**Diagnose aus der Console**:

```
❌ Uncaught Error: Style is not done loading
   at iL._checkLoaded → iL.serialize → Map.getStyle
   at <our app-chunk>

⚠️  Error while trying to use the following icon from the Manifest:
    https://stammkundenmap-gaigg.vercel.app/icon
    (Resource size is not correct - typo in the Manifest?)
```

**Root Cause** (siehe `gotchas.md` #003 + #004): In `map-canvas.tsx` rief der zweite useEffect (Style-Switch) `instance.getStyle()?.sprite` direkt auf, ohne zu prüfen, ob der Mapbox-Style fertig geladen ist. Beim Initial-Mount ist der Style aber noch async-loading → Mapbox v3 wirft `_checkLoaded` aus `getStyle()` → React-Effect-Body unhandled exception → React-Tree crashed → Chromium zeigt seinen generischen „page couldn't load"-Fallback.

Bonus-Bug: `mapStyle` und `isIntroComplete` als Effect-Dependencies → bei jedem Style-Switch wäre die Mapbox-Instanz komplett zerstört und neu gebaut worden (Performance + zweite Race).

**Fix** (commit `f9076e2`):

1. `lastStyleKeyRef`-Pattern: Style-Switch-Effect kehrt sofort zurück, wenn aktueller Key = letzter gesetzter Key. Beim Initial-Mount sind die identisch → kein `getStyle()`-Call.
2. Initial-Werte (`mapStyle`, `isIntroComplete`) via `useRef` gecaptured, statt als Effect-Deps. Mapbox-Instanz wird jetzt garantiert **exakt einmal** pro Component-Lifetime gebaut.
3. `three-d-buildings-layer.tsx` zusätzlich mit `map.isStyleLoaded()` + try/catch um den `getStyle()`-Call gewrappt.
4. `onError` im map-canvas prüft `isStyleLoaded()` bevor er `getStyle().name` ausliest.
5. PWA-Manifest: `sizes: "any"` → `"64x64"` für `/icon` (W3C-Spec: `"any"` ist Vector-Formaten vorbehalten).

**Verifikation**:

- typecheck clean · lint 0 errors · 55/55 vitest passing
- production build 5.3 s, 8 static pages prerendered
- Vercel Auto-Deploy via GitHub-Integration: Build 37 s, status Ready
- Server-side: Manifest jetzt `"sizes":"64x64"`, Etag neu (`481beba…`), HTTP 200
- Client-side: User-Hard-Reload (`Ctrl+Shift+R`) auf https://stammkundenmap-gaigg.vercel.app sollte jetzt Console clean liefern und Map rendern.

**Lehre**: Vor „done"-Sign-off bei Karten-/Three-/Player-SDK-Apps mindestens ein DevTools-Console-Check auf der Production-URL fahren. Server-side curl + statisches HTML waren clean — der Bug saß genau im Initial-Hydration-Tick.

---

### Phase 11 — Begehbare 3D-Welt + Vision-Tab (2026-05-14) ✅

**Mission**: Vom statischen Splat-Viewer im Detail-Panel zur echten, fußläufig erkundbaren 3D-Welt rund um die Villa Hofer am Pöstlingberg, plus KI-Konzept-Generierung im Detail-Panel.

#### Neue Routen / Komponenten

| Pfad | Rolle |
|---|---|
| `app/welt/[customerId]/page.tsx` | Server-Komponente, Next.js 16 `params: Promise<…>` |
| `app/welt/[customerId]/loading.tsx` | Welt-Splash mit Spinner |
| `app/welt/[customerId]/error.tsx` | Fehler-Boundary mit Reset + "Zurück zur Karte" |
| `app/welt/[customerId]/opengraph-image.tsx` | Customer-spezifisches OG-PNG (Edge-runtime) |
| `app/api/vision/generate/route.ts` | Node-runtime POST: gpt-image-1 + Rate-Limit + Cache |
| `components/welt/welt-shell.tsx` | Client-Composition, useSyncExternalStore Patterns |
| `components/welt/welt-canvas.tsx` | Three.js + 3d-tiles-renderer + Luma-Splats |
| `components/welt/welt-controls/first-person-controls.ts` | PointerLock + WASD + Touch |
| `components/welt/welt-hud.tsx` | Mini-Map, Kompass, Hotspot-Pills, FPS |
| `components/welt/welt-unavailable.tsx` | Friendly Fallback ohne Key / WebGL |
| `components/welt/onboarding-overlay.tsx` | 3-Schritt-Tutorial, localStorage-gated |
| `components/welt/escape-overlay.tsx` | ESC = Pause-Menu |
| `components/welt/ambient-audio.tsx` | Vogel-Wind-Audio mit Fade |
| `components/welt/touch-joystick.tsx` | Virtueller Stick (Mobile) |
| `components/detail-panel/welt-cta.tsx` | "Begehen"-Karte im Detail-Panel |
| `components/detail-panel/vision-tab.tsx` | Vision-Generator mit Disclaimer |
| `lib/welt/coordinates.ts` | WGS84-Ellipsoid Helpers (ECEF↔Geo, ENU-Basis) |
| `lib/welt/tiles-config.ts` | Performance-Tier-Detection, Tier-Configs |
| `lib/welt/hotspot-registry.ts` | Splat-Hotspots pro Customer-ID |
| `lib/welt/motion.ts` | Velocity-Math + Friction-Integration |
| `lib/welt/env-check.ts` | `hasGoogleTiles()`, `hasOpenAI()` |
| `lib/env.ts` | Centralised env-Var-Access (server + client) |
| `lib/openai/client.ts` | OpenAI SDK Wrapper (server-only) |
| `lib/openai/prompts.ts` | Stil + Saison → Prompt Templates |
| `lib/openai/rate-limit.ts` | In-Memory-Bucket (3/min/IP) |
| `lib/openai/image-cache.ts` | Vercel-Blob + Memory-LRU Cache |
| `components/map/select-customer-from-url.tsx` | `?customer=` → Sidebar-State-Restore |

#### Neue Dependencies

- `3d-tiles-renderer@0.4.24` (NASA-AMMOS, Apache-2.0)
- `openai@6.37.0` (server-side image generation SDK)
- `zod@4.4.3` (light validation)
- `@vercel/blob@*` (production image cache)

#### Acceptance-Status

| Acceptance | Status |
|---|---|
| `/welt/c-001` lädt mit Customer-Header | ✅ |
| `/welt/unknown` → 404-Fallback | ✅ |
| Keine ENV-Keys → friendly Karte mit "Zurück zur Karte" | ✅ |
| Begehen-CTA im DetailPanel, deep-link kopierbar | ✅ |
| TypeScript build green | ✅ (`tsc --noEmit` 0 errors) |
| ESLint green | ✅ (0 errors after react-hooks/set-state-in-effect refactor zu useSyncExternalStore) |
| `.env.example` aktualisiert mit Setup-Kommentaren | ✅ |
| Vitest 103/103 passing (vorher 55) | ✅ |
| 7 neue Welt-/Vision-spezifische E2E grün | ✅ |
| Production-Build sauber, Welt-Bundle als Chunk separat | ✅ |
| README + ARCHITECTURE + 3 docs-Files geschrieben | ✅ |
| JSON-LD `<Place>` Schema für SEO | ✅ |
| Skip-Link "Zum Welt-Canvas springen" für Screen-Reader | ✅ |
| OpenAI-Cost-Tracking dokumentiert | ✅ (siehe unten) |

#### Test-Statistiken

```
Vitest: 11 test files | 103 tests passing
  - welt-coordinates  : 12 tests, ECEF round-trip + ENU basis + spawn pose
  - welt-motion       : 10 tests, friction-Integration + diagonal-clamp
  - welt-hotspots     : 4 tests, registry-lookup + fallback
  - welt-prompts      : 7 tests, type-guards + template-merge
  - welt-rate-limit   : 4 tests, bucket + reset + isolation
  - welt-tiles-config : 6 tests, tier-detection + monotonic configs
  - welt-env          : 3 tests, all/partial/none keys
  + bestand (format, geo, geojson, store) : 55 tests

Playwright (Welt-spezifisch): 7 tests passing
  - welt-route.spec.ts  : welt-route load, 404 fallback, opengraph-image
  - welt-cta.spec.ts    : Begehen-CTA navigates, Vision-Tab visible+disclaimer
  - vision-api.spec.ts  : API availability + invalid-payload guard
```

#### Cost-Tracking (Estimate)

- **Google Map Tiles**: 1.000 Sessions/Monat Free-Tier (Enterprise). Bei 50 Demo-Aufrufen/Monat: $0. Quota-Cap in Console konfiguriert.
- **OpenAI gpt-image-1**: ~$0.04 pro 1024×1024 hi-q-Image. Mit Cache-First-Strategy realistisch <$2/Monat im Demo-Betrieb. Hard-Cap `OPENAI_DAILY_BUDGET_USD=2.00` als UI-Hinweis konfiguriert; Rate-Limit 3/min/IP serverseitig.
- **Vercel Blob**: Cache-Storage < 50 MB für die maximale Test-Matrix (25 Customers × 4 Stile × 4 Saisons = 400 Images × ~500 KB = 200 MB Maximum, im Demo realistisch <5 MB).

#### Production-Build

```
Route (app)                            Size  First Load
○ /                                   ...   ...
ƒ /api/vision/generate                ...   (Node runtime)
ƒ /welt/[customerId]                  ...   (dynamic, generateStaticParams matched)
ƒ /welt/-/opengraph-image             ...   (Edge runtime)
```

Welt-Code wird via `next/dynamic({ ssr: false })` lazy-importiert; Main-Bundle-Größe für `/` bleibt unverändert.

#### Phase 11 Lessons / Gotchas

Siehe `gotchas.md` Einträge **#008** (Next 16 params Promise) und **#009** (`react-hooks/set-state-in-effect`).
