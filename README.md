# StammKundenMap — Gartengestaltung Gaigg

Eine premium-interaktive Karte der 25 Stammkunden der fiktiven „Gartengestaltung Gaigg" in Linz und Umgebung. Globe-to-Linz-Anflug, 3D-Buildings, Heatmap, Cluster, Pins, virtualisierte Sidebar, Detail-Panel mit Tabs und 3D-Gaussian-Splat-Viewer (Iframe + Three.js + Luma Web).

> 🌱 _„Premium-Gartenpflege seit 2011"_

**🌐 Live**: [stammkundenmap-gaigg.vercel.app](https://stammkundenmap-gaigg.vercel.app) · **📦 Repo**: [aserte2001/stammkundenmap-gaigg](https://github.com/aserte2001/stammkundenmap-gaigg)

## ✨ Features

- **Mapbox GL JS v3** — Globe-Projektion, „dusk" light-preset, native 3D-Buildings über `show3dObjects`
- **Cinematic Intro** — 3.8 s flyTo vom Globus zu Linz, mit „Direkt zur Karte"-Skip-Button
- **Heatmap + Cluster + Pins** — smooth Übergang zwischen Zoom-Stufen, Status-Farben, VIP-Twinkle
- **Custom SVG Pins** — pro Gartentyp (Ziergarten, Nutzgarten, Dachgarten, Park, Firmengelände, Gastgarten)
- **Selection Pulse** — animierter Ring um den ausgewählten Kunden via `setPaintProperty` rAF-Loop
- **Sidebar** — virtualisierte Liste (`@tanstack/react-virtual`), Status/Typ/Gewerk-Filter, Viewport-only-Toggle
- **Fuzzy Search** — Fuse.js auf Name, Adresse, Bezirk, Notizen, Gewerken
- **Detail-Panel** — Foto + VIP-Krone, Status-Chip, Tabs (Übersicht, Aufträge, Notizen, 3D-View, **Vision**), Route-planen-Button, **Welt-begehen-CTA**
- **3D-Splat-Viewer** — Iframe (Default) oder Three.js + `@lumaai/luma-web` (progressive enhancement)
- **🆕 Begehbare 3D-Welt** — `/welt/[customerId]`: Google Photorealistic 3D Tiles + Luma-Splat-Hotspots + First-Person-WASD/Joystick (siehe Abschnitt unten)
- **🆕 Marble-Splat-Welten** — admin-only Capture-Workflow: 4–8 Phone-Fotos → World Labs Marble API → Spark 2.0 Splat-Renderer im Browser. Pro Welt ~€1,18 (siehe Abschnitt unten)
- **🆕 Vision-Tab** — KI-Konzept-Generierung mit OpenAI gpt-image-1 (4 Stile × 4 Saisons), mit Disclaimer, Cache, Rate-Limit
- **Command-Palette** — `Cmd+K` mit Kunden, Stil-Switch, Filter-Shortcuts
- **Tastaturnavigation** — `/`, `↑/↓`, `Enter`, `Esc`, `Cmd+K`, `?` (Shortcuts-Dialog)
- **Responsive** — Desktop Glas-Sidebar + Floating-Header, Mobile Drawer + Bottom-Sheet
- **Accessibility** — `prefers-reduced-motion` respektiert (CSS + Motion), aria-Labels, Tab-Trap im Panel, Skip-Link auf Welt-Route
- **PWA** — Manifest, generierte Icons, OG-Image (Index + dynamisch pro Welt-Route), robots+sitemap

## 🌍 Begehbare 3D-Welt — `/welt/[customerId]`

Klick auf eine Kundennadel öffnet das Detail-Panel mit einem **„Welt begehen"-CTA**. Der CTA führt zu einer fullscreen 3D-Welt mit Google Photorealistic 3D Tiles rund um die echte Kundenadresse.

- **First-Person-Navigation**: WASD + Maus (Desktop, Pointer-Lock), Joystick + Drag (Mobile)
- **Splat-Hotspots**: Luma Gaussian-Splat-Captures als 3D-Object3D-Overlay, lazy-loaded ab 200 m Distanz
- **HUD**: Mini-Map (Mapbox-Static, dreht mit Heading), Kompass, FPS-Counter, Hotspot-Pills, Attribution-Footer
- **Onboarding**: 3-Schritte-Tutorial beim ersten Besuch, `localStorage`-gated
- **Pause-Menü**: ESC öffnet ein Overlay mit Resume / Tutorial / Audio / Zurück
- **Performance-Tier**: automatische Erkennung (high / balanced / low) basierend auf `hardwareConcurrency`, `deviceMemory`, Pointer-Type
- **Fallback**: ohne Google-Key oder ohne WebGL → freundlicher Setup-Hinweis statt leerer Screen

→ **Setup-Guide**: [docs/welt-setup.md](./docs/welt-setup.md) · **Steuerung**: [docs/welt-keyboard.md](./docs/welt-keyboard.md) · **Architektur**: [docs/welt-architecture.md](./docs/welt-architecture.md)

## 🪐 Marble-Splat-Welten — `/capture/[customerId]` & `/welt/[customerId]`

VIP-Stammkunden bekommen photorealistische 3D-Welten ihres Gartens, geführt vom Admin (Simon) vor Ort.

- **Capture vor Ort**: Phone-getriggerter Workflow mit Kompass-Coaching, 4 / 8 Fotos je nach Garten-Größe; Drohnen-Upload als Alternative; IndexedDB-Resume bei Browser-Schluss
- **Marble API**: World Labs Marble (`marble-1.1` für Standard, `marble-1.1-plus` für große Gärten), Pricing 1.600–3.100 Credits ≈ €1,18–€2,28 pro Welt
- **Spark 2.0 Renderer**: drei Auflösungs-Tiers (Mobile 100k, Desktop 500k, HQ full_res), Auto-Detection via `pointer:coarse`, manueller Override
- **Multi-World**: bei großen Gärten mehrere Captures mit Standort-Switcher
- **Vercel-Backend**: Blob für `splat-mappings.json`, Cron 1×/min für Status-Polling, Edge Config für monatlichen Cost-Cap (Soft 50, Hard 100)
- **Auth**: Vercel Password Protection für die ganze App (eine User-Group: Simon)
- **DSGVO**: [/datenschutz](./app/datenschutz/page.tsx) Page erwähnt World Labs als Auftragsverarbeiter, AVV-Anfrage in [docs/avv-template.md](./docs/avv-template.md)

→ **Workflow-Doku**: [docs/capture-workflow.md](./docs/capture-workflow.md) · **Tech-Doku**: [docs/marble-integration.md](./docs/marble-integration.md) · **API-Schema**: [docs/marble-api-schema.md](./docs/marble-api-schema.md)

### Setup-Quickref (Marble)

```bash
# 1. Vercel Marble API key (kaufst du auf platform.worldlabs.ai)
echo "WORLDLABS_API_KEY=<dein-key>" >> .env.local

# 2. Vercel Blob + Edge Config: einmalig per Vercel Dashboard anlegen
#    Storage → Create Blob Store → Name "stammkundenmap-splats"
#    Storage → Create Edge Config → Name "stammkundenmap-counters"
#    → BLOB_READ_WRITE_TOKEN und EDGE_CONFIG werden automatisch in env vars gesetzt

# 3. Cron-Secret generieren und setzen
vercel env add CRON_SECRET production  # input: $(openssl rand -hex 32)

# 4. Vercel Password Protection im Dashboard aktivieren
#    Settings → Deployment Protection → Password Protection (Production+Preview)

# 5. Deploy — vercel.json registriert automatisch den Cron */1 * * * *
vercel --prod
```

### Vision-Tab

Neuer Tab im Detail-Panel mit OpenAI `gpt-image-1`-basierter Konzeptgenerierung:

- **4 Stile** (modern, mediterran, japanisch, naturalistisch) × **4 Saisons** = 16 Kombinationen
- Server-Endpoint `/api/vision/generate` mit Zod-Validation, In-Memory-Rate-Limit (3/min/IP), Cache (Vercel Blob in Production, Memory in Dev)
- **Disclaimer** „KI-Konzept — keine echte Garten-Vorschau" pro Image-Overlay
- Cost-Tracking: ~$0.04 pro frischem Image, Cache-Hit kostenlos

## 🧱 Tech-Stack

| Layer            | Library                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| Framework        | **Next.js 16** App Router, Turbopack default, React 19.2                             |
| Styling          | **Tailwind CSS v4** mit oklch-Tokens und `@theme inline`, **shadcn/ui** (Nova preset) |
| Karte            | **Mapbox GL JS v3** (Globe + Standard style)                                         |
| 3D-Tiles         | **3d-tiles-renderer 0.4** + GoogleCloudAuthPlugin (NASA-AMMOS)                       |
| 3D Splat         | **Three.js 0.184** + **`@lumaai/luma-web` 0.2** (Iframe fallback)                    |
| KI-Bilder        | **openai 6** SDK (gpt-image-1), Vercel Blob für Cache                                |
| State            | **Zustand 5**                                                                        |
| Search           | **Fuse.js 7**                                                                        |
| Animation        | **Motion 12** (ehem. framer-motion), CSS keyframes                                   |
| Virtualisierung  | **`@tanstack/react-virtual` 3**                                                      |
| Icons            | **lucide-react** + selbst gezeichnete SVG-Pins                                       |
| Fonts            | **Geist** Sans + Mono                                                                |
| Toast            | **sonner** 2                                                                         |
| Tests            | **Vitest 4** (jsdom + v8 coverage), **Playwright 1.60** (Chromium + iPhone-13)       |

## 🚀 Setup

```bash
git clone https://github.com/aserte2001/stammkundenmap-gaigg.git
cd stammkundenmap-gaigg
cp .env.example .env.local
# In .env.local mindestens NEXT_PUBLIC_MAPBOX_TOKEN setzen.
# Für die Welt-Route + Vision-Tab zusätzlich:
#   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Browser, referrer-restricted)
#   OPENAI_API_KEY (server-only, Sensitive)
# Detail-Setup: docs/welt-setup.md
npm install --legacy-peer-deps
npm run dev
```

→ `http://localhost:3000` (Karte)  ·  `http://localhost:3000/welt/c-001` (Welt)

> **Hinweis zum `legacy-peer-deps`-Flag**: `@lumaai/luma-web@0.2.x` deklariert `@types/three@^0.157` als peerDependency, wir verwenden `@types/three@0.184` (kompatibel zur Runtime, nur Typen). Das `.npmrc` setzt `legacy-peer-deps=true` automatisch.

## 📜 Scripts

| Befehl                  | Zweck                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm run dev`           | Dev-Server mit Turbopack                                               |
| `npm run build`         | Produktions-Build                                                      |
| `npm run start`         | Produktions-Server                                                     |
| `npm run lint`          | ESLint (Next.js core-web-vitals + TypeScript)                          |
| `npm run typecheck`     | `tsc --noEmit`                                                         |
| `npm run format`        | Prettier (mit Tailwind-Plugin)                                         |
| `npm run format:check`  | Prettier nur prüfen (für CI)                                           |
| `npm test`              | Vitest (Unit-Tests)                                                    |
| `npm run test:coverage` | Vitest mit v8-Coverage und Schwellwerten                               |
| `npm run test:e2e`      | Playwright (Chromium + iPhone-13). Erfordert vorher `npm run build`.   |
| `npm run fetch:photos`  | Regeneriert die 25 generativen Garten-SVGs in `public/photos/`         |

## 🎨 Designsystem

Gartengrün als Identitätskern, oklch-basiert für visuelle Tiefe im Dunkelmodus:

| Token         | Wert                            | Verwendung                |
| ------------- | ------------------------------- | ------------------------- |
| `--primary`   | `oklch(0.72 0.18 145)`          | CTA, Selected-Pin, Logo   |
| `--accent`    | `oklch(0.82 0.16 92)`           | Stats-Highlights          |
| `--vip`       | `oklch(0.78 0.20 50)`           | VIP-Crone, VIP-Twinkle    |
| `--warning`   | `oklch(0.74 0.18 30)`           | Wartung-fällig            |
| `--success`   | `oklch(0.74 0.16 145)`          | Aktiv                     |
| `--info`      | `oklch(0.74 0.12 220)`          | Neu, Saison-Pause         |
| `--background`| `oklch(0.16 0.018 150)`         | Body-Hintergrund          |
| `--card`      | `oklch(0.22 0.025 150)`         | Sidebar, Detail-Panel     |

## 🌍 Daten

`lib/customers.ts` enthält 25 hand-curated, fiktive Kunden über Linz und Umgebung:

- **15 privat** (Ziergarten, Nutzgarten, Dachgarten)
- **7 gewerbe** (Hotel-Innenhof, Restaurant-Gastgarten, Tabakfabrik-Campus, Plus City)
- **3 öffentlich** (Volksgarten, Schulhof Khevenhüller, St.-Barbara-Friedhof)
- **4 VIP** — `Villa Hofer` (Pöstlingberg), `Anwesen Wimmer` (Wilhering), `Hotel Wolfinger`, `Restaurant Stadtkrämerei`
- **2 mit 3D-Splat-Demo** — `Villa Hofer` und `Hotel Wolfinger` zeigen den Luma-Web-Viewer
- Echte Linzer Bezirke: Pöstlingberg, Urfahr, Solar City, Ebelsberg, Keferfeld, Leonding, Traun, Wilhering, Gallneukirchen, Steyregg, Engerwitzdorf, Innenstadt, Donaulände, Pasching, Tabakfabrik, Bulgariplatz

## 🧪 Quality-Gates

| Gate              | Status                                  |
| ----------------- | --------------------------------------- |
| TypeScript strict | ✅ `tsc --noEmit` clean                  |
| ESLint            | ✅ 0 errors, 0 warnings                  |
| Prettier          | ✅ auf alle Dateien                      |
| Unit-Coverage     | ✅ Statements 87 % · Branches 90 % · Functions 84 % · Lines 86 % |
| Vitest            | ✅ 55 / 55 tests passing                 |
| Playwright        | 5 specs, 16 tests (Chromium)            |
| Build             | ✅ 8 statische Pages                     |
| `prefers-reduced-motion` | ✅ getestet via E2E              |

## 📂 Projekt-Struktur

```
.
├── app/
│   ├── layout.tsx           # Geist, Metadata, OG, JSON-LD LocalBusiness
│   ├── page.tsx             # Map + Sidebar + DetailPanel + CommandPalette + ShortcutsDialog + KeyboardNav
│   ├── globals.css          # Tailwind v4 + oklch Tokens + Keyframes
│   ├── manifest.ts / robots.ts / sitemap.ts
│   ├── icon.tsx / apple-icon.tsx / opengraph-image.tsx
├── components/
│   ├── map/                 # MapShell, MapCanvas, ClusterHeatLayer, CustomerPinLayer, ThreeDBuildings, IntroAnimation, MapControls, MapStyleSwitcher, MapContext
│   ├── sidebar/             # Sidebar, SidebarHeader, FilterBar, SearchInput, CustomerList, CustomerListItem
│   ├── detail-panel/        # DetailPanel, CustomerHeader, ServiceTabs, Timeline, SplatViewer, SplatIframe, SplatThreeRenderer
│   ├── brand/               # Logo, brand-tokens
│   ├── command-palette.tsx  # Cmd+K
│   ├── keyboard-nav.tsx     # /, arrows, Esc, ?
│   ├── shortcuts-dialog.tsx
│   ├── toaster.tsx          # sonner
│   └── ui/                  # 20 shadcn primitives
├── lib/
│   ├── customers.ts         # 25 Kunden
│   ├── store.ts             # Zustand + filterCustomers/Stats/hasActiveFilters
│   ├── format.ts            # de-AT Formatters
│   ├── geo.ts               # haversine, bounds
│   ├── geojson.ts           # FeatureCollection mit weight/iconKey/isVip
│   ├── map-config.ts        # Styles, Default-View, Color-Ramps
│   └── __tests__/           # 4 Vitest-Suiten, 55 specs
├── scripts/
│   └── generate-photos.ts   # deterministische SVG-Garten-Szenen
├── e2e/                     # 5 Playwright-Specs
├── public/
│   ├── photos/              # 25 generative SVG-Gartenfotos
│   └── icons/               # 6 SVG-Pin-Icons (gardenTypes)
├── .github/workflows/       # CI + Lighthouse
├── BUILD_NOTES.md           # autonomer Build-Report
├── gotchas.md               # Lessons learned
├── ARCHITECTURE.md          # Layering & Entscheidungen
└── README.md
```

## 🛠 Manuelles Deploy auf Vercel

Falls die automatische CLI scheitert:

1. Auf [vercel.com/new](https://vercel.com/new) das GitHub-Repo `stammkundenmap-gaigg` importieren.
2. Framework Preset = **Next.js**.
3. **Environment Variables** unter „Production":
   - `NEXT_PUBLIC_MAPBOX_TOKEN` = `pk.…`
4. Deploy.

Alternativ via CLI:

```bash
npx vercel@latest --yes
npx vercel env add NEXT_PUBLIC_MAPBOX_TOKEN production
npx vercel deploy --prod
```

## ⌨ Tastaturkürzel

| Aktion                         | Tasten          |
| ------------------------------ | --------------- |
| Schnellsuche / Befehle         | `⌘` + `K`       |
| Tastaturkürzel anzeigen        | `?` / `⌘` + `/` |
| Kundensuche fokussieren        | `/`             |
| Liste navigieren               | `↑` / `↓`       |
| Kunde auswählen                | `Enter`         |
| Panel schließen / Suche leeren | `Esc`           |

## 📜 License

Tech-Demo für einen Pitch — kein kommerzielles Produkt. Mapbox-Token in `.env.local` ist ein Demo-Token; bei Bedarf einen eigenen unter [account.mapbox.com](https://account.mapbox.com/access-tokens/) anlegen.

---

## English (short)

A premium, interactive Mapbox-powered map of 25 fictional customers of „Gartengestaltung Gaigg" in Linz, Austria. Built as a tech showcase combining Next.js 16, Tailwind 4, shadcn/ui, Mapbox GL JS v3 globe view, Three.js + Luma Web for 3D Gaussian Splats, Zustand state, Fuse.js fuzzy search, and Playwright/Vitest test coverage. Designed and produced in a single autonomous Claude-driven run. See `BUILD_NOTES.md` for the build report, `ARCHITECTURE.md` for design decisions.
