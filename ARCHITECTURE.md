# ARCHITECTURE.md — StammKundenMap (Gartengestaltung Gaigg)

## Layering

```
┌─────────────────────────────────────────────────────────┐
│ app/page.tsx  (Server Component, Composition only)      │
│   ├─ <MapShell>  (Client, next/dynamic ssr:false)       │
│   │     ├─ <MapCanvas> (Mapbox-GL instance)             │
│   │     ├─ <ClusterHeatLayer>                           │
│   │     ├─ <CustomerPinLayer>                           │
│   │     ├─ <ThreeDBuildingsLayer>                       │
│   │     ├─ <MapControls>                                │
│   │     └─ <IntroAnimation>                             │
│   ├─ <Sidebar> (client)                                 │
│   │     ├─ <SidebarHeader> (stats)                      │
│   │     ├─ <SearchInput> ('/' hotkey)                   │
│   │     ├─ <FilterBar>   (status/type/services chips)   │
│   │     └─ <CustomerList> (virtualised)                 │
│   ├─ <DetailPanel> (Sheet)                              │
│   │     ├─ <CustomerHeader> (photo, badges, route btn)  │
│   │     └─ <ServiceTabs>                                │
│   │           ├─ Overview                               │
│   │           ├─ Timeline                               │
│   │           ├─ Notes                                  │
│   │           └─ <SplatViewer>                          │
│   │                 ├─ <SplatIframe>                    │
│   │                 └─ <SplatThreeRenderer>             │
│   ├─ <CommandPalette> (Cmd+K)                           │
│   ├─ <ShortcutsDialog>                                  │
│   └─ <KeyboardNav> (global listeners)                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
             ┌────────────────────────────┐
             │ Zustand store (lib/store)   │
             │ - selectedCustomerId        │
             │ - hoveredCustomerId         │
             │ - filters (Set per facet)   │
             │ - mapStyle, viewportOnly    │
             │ - visibleIdsInViewport      │
             │ - dialog/palette flags      │
             └────────────────────────────┘
                          ▲
                          │ filterCustomers + filterStats (selectors)
                          │
             ┌────────────────────────────┐
             │ lib/customers.ts (25 Customers, hand-curated) │
             └────────────────────────────┘
```

## Data Flow

1. **Customer data** (`lib/customers.ts`) is a static constant — single source of truth.
2. **Zustand store** holds UI state only. The customer list is *never* mutated.
3. **`filterCustomers()`** is a pure function: takes the immutable list + filter state + viewport-only options → returns filtered Customer[]. Used by Sidebar list **and** by `ClusterHeatLayer.setData()`.
4. **GeoJSON adapter** (`lib/geojson.ts`) converts customers to `FeatureCollection` with derived properties (iconKey, isVip, weight).
5. **Map layers** are React components that:
   - On mount: add source + layers via `map.addSource` / `map.addLayer`.
   - On filter change: re-derive filtered list and call `source.setData()`.
   - On unmount: remove layers + source.
6. **Selection sync**:
   - Pin-Click → `select(id)` → store update → Sidebar item highlights, Detail-Panel opens, map flies to coords pitch 65° via effect in `customer-pin-layer.tsx`.
   - Sidebar Hover → `hover(id)` → store update → `feature-state` `{hover: true}` for that feature.

## Why these libraries

| Decision | Reasoning |
|---|---|
| Mapbox GL JS v3 (vs MapLibre) | Standard style provides Globe + 3D-Buildings + Atmosphere natively via `setConfigProperty('basemap', …)`. MapLibre would need to stitch each via plugins/custom layers. |
| Globe projection in canvas init | Allows the Globe → Linz fly-in cinematic. The user is grounded in the world, then dives into the local context. |
| Symbol-Layer over HTML markers | GPU-accelerated rendering. 25 pins are fine either way, but the pattern scales to thousands. |
| Feature-state for hover/selected | Avoids re-render churn; Mapbox internally diffs and applies paint properties on the GL state. |
| rAF loop for selected-pulse | Mapbox doesn't support time-based animation expressions; the simplest premium pulse is a manual `setPaintProperty` cycle. |
| `@tanstack/react-virtual` | List of 25 doesn't need virtualisation today — but VIP demo: 25→250→2500 customers would degrade DOM. Future-proof. |
| Zustand (vs Redux/Context) | Tiny, no provider needed, supports Sets natively, easy to test. |
| Fuse.js | Forgiving fuzzy matching across multiple fields with different weights. |
| Motion 12 | Already a peer to React 19. Smooth `useReducedMotion` integration. |
| `@lumaai/luma-web` + iframe fallback | Iframe ships in 5 lines and uses Luma's official embed; Three.js renderer gives full control + auto-rotate + reset-view. User toggles between them. |
| Geist font | Default in shadcn Nova preset, optical balance with Tailwind 4 typography. |
| oklch tokens | Linear perceptual color space → smooth gradients and tint variations without muddy mid-tones (the Gartengrün identity demanded it). |

## Performance Decisions

- **`next/dynamic({ ssr: false })`** for `<MapShell>` and `<SplatThreeRenderer>` — Mapbox and Three.js are huge libraries (Mapbox ~800 kB minified) and only render on the client.
- **Image optimisation off for SVG** (`unoptimized`): SVGs are ~12 kB inline-paintable.
- **`optimizePackageImports: ['lucide-react']`** in `next.config.ts` for tree-shaking individual icons.
- **Selection-pulse rAF runs only when a pin is selected** (cleanup on null select).
- **`map.queryRenderedFeatures`** is *not* used in `moveend`; instead we use a precomputed coords lookup attached to `window.__customerCoords` to test `bounds.contains()`, which is O(N) but cheap for N=25.
- **CSS animations** respect `prefers-reduced-motion` via a global `@media` block that overrides all `animate-*` utilities.
- **`pointer-events-none`** on the floating header to let map gestures pass through except the explicit panels.

## Accessibility

- All interactive controls have `aria-label`s in German.
- Tab-trap is delegated to shadcn's `Sheet` and `Dialog` primitives (Radix UI).
- `prefers-reduced-motion` skips fly-in, switches to `jumpTo`, and disables decorative pulses.
- Color contrasts: oklch palette tuned so success/warning/info/vip tints stay above WCAG AA on the `--background` color.
- Keyboard navigation: `/` focuses search, arrows step through filtered list, `Enter` selects, `Esc` blurs/closes, `Cmd+K` opens command palette, `?` opens shortcuts dialog.

## Tests

- **Unit (vitest)**: 55 tests across format, geo, geojson, store. Coverage statements 87 % / functions 84 % / lines 86 %.
- **E2E (Playwright)**: 5 spec files, run in Chromium and iPhone-13 viewport. Cover map load, sidebar visibility, search, filter, detail panel open/close, Escape behavior, reduced-motion intro skip.
- **Lighthouse CI**: triggered on Vercel deployment_status (preview URLs) via `lighthouse.yml` workflow. Targets: performance ≥ 85, accessibility ≥ 95, best-practices ≥ 95, SEO 100.

## Trade-offs & Future Work

- The **photo SVGs are generative** rather than real photos. For a real customer pitch you'd swap in a real photo CDN. The architecture supports it: `customer.photoUrl` is a string, currently `/photos/<id>.svg`, but works equally well with `https://images.unsplash.com/...`.
- The **2 splat demos point to the same public Luma capture** because Gartengestaltung Gaigg doesn't actually exist. For a real pitch each VIP customer would have their own Luma scan.
- **No backend**. The customer dataset is hardcoded in `lib/customers.ts`. A real product would fetch from `/api/customers/route.ts` which is intentionally stubbed in the project structure.
- **`@types/three` peer mismatch with @lumaai/luma-web** is silenced via `.npmrc` `legacy-peer-deps=true`. Functional, but worth tracking in `gotchas.md`.
- **Mapbox standard satellite style** at high zoom may show generic 3D-objects without the Gartengestaltung-Gaigg branding. A custom Mapbox Studio style would be the next polish step.
