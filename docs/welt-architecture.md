# Welt-Architektur — begehbare 3D-Welt

## Zielbild

Eine Next.js-Route `/welt/[customerId]` rendert eine fullscreen 3D-Welt:

```
Browser
 └─ Next.js (Server) — page.tsx prüft customer + env, rendert Shell
     └─ <WeltShell>  (Client, "use client")
         ├─ <WeltCanvas>          dynamic-imported (ssr:false), Three.js
         │    ├─ TilesRenderer    (3d-tiles-renderer + GoogleCloudAuthPlugin)
         │    ├─ LumaSplatsThree  als Hotspot-Object3D
         │    ├─ FirstPersonControls  (PointerLock + WASD + Touch)
         │    └─ Telemetry-Stream  → onTelemetry callback
         ├─ <WeltHud>             Mini-Map, Kompass, Stationen, FPS
         ├─ <OnboardingOverlay>   Erst-Visit, localStorage gated
         ├─ <EscapeOverlay>       ESC = Pausemenü
         └─ <AmbientAudio>        Vogel-Ambient, mute-fähig
```

## Datenfluss

```
generateStaticParams (build-time)
        │
        ▼
Server-Component `page.tsx`
        │  (params async + searchParams async — Next.js 16)
        │  notFound() bei unbekannter Customer-ID
        ▼
<WeltShell>  (Client)
        │
        ├── useSyncExternalStore: WebGL-Check, Onboarding-Flag
        ├── dynamic({ ssr: false }) → <WeltCanvas>
        │
        ▼
<WeltCanvas>
        │
        ├── new TilesRenderer(GOOGLE_TILES_ROOT)
        ├── registerPlugin(new GoogleCloudAuthPlugin({ apiToken: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }))
        ├── camera.position = spawnPoseSouthEast(customer, 80m, 32m)
        ├── camera.up      = surface normal at customer
        ├── requestAnimationFrame(tick):
        │   ├── tilesRenderer.update()
        │   ├── compute desired velocity (motion.ts)
        │   ├── integrate velocity into camera.position
        │   ├── ground-clamp via Raycast against tiles.group
        │   ├── update hotspot proximity → ensureSplat / removeSplat
        │   ├── update telemetry (every 500 ms)
        │   └── renderer.render(scene, camera)
        │
        └── cleanup: tilesRenderer.dispose(), controls.dispose(), splats.dispose(), renderer.dispose()
```

## Koordinaten-System

- **ECEF** (Earth-Centered-Earth-Fixed) — Globus-Koordinaten, Earth-Radius ≈ 6.371 km.
- Camera-Settings: `near=1`, `far=50_000_000`, `fov=70`.
- Geo→ECEF via `WGS84.getCartographicToPosition(lat[rad], lng[rad], alt[m], target)`.
- Walker-lokales Frame an aktueller Position via `WGS84.getEastNorthUpAxes(...)` → tangentiale Bewegung.

## Tier-Tuning

Performance-Tier wird beim Mount automatisch erkannt (`lib/welt/tiles-config.ts`):

| Tier | errorTarget | maxDepth | lruMaxSize | parseQueue | downloadQueue |
|---|---|---|---|---|---|
| high | 12 | 24 | 800 | 6 | 12 |
| balanced | 16 | 22 | 500 | 4 | 8 |
| low | 24 | 18 | 300 | 2 | 4 |

`detectTierFromUserAgent` nutzt `hardwareConcurrency`, `hasWebGL2`, `isCoarsePointer`, `deviceMemory`.

## Splat-Hotspot-Overlay

```
Hotspot { id, label, lat, lng, alt, splatUrl }
  │
  ├── Sprite-Marker im scene, position = latLngAltToECEF(lat, lng, alt + 12)
  └── LumaSplatsThree
      ├── Created lazily wenn Distance < 200 m
      ├── Aligned via WGS84.getEastNorthUpFrame(lat, lng, alt + 1.6) → applied to splat.matrix
      ├── Disposed bei Distance > 400 m (Memory-Sparsamkeit)
      └── enableThreeShaderIntegration: true (lights from scene)
```

## Vision-Tab-Pipeline

```
<VisionTab> (Client)
  │   POST /api/vision/generate { customerId, style, season }
  ▼
API-Route (Node-Runtime)
  ├── zod-light validation (string-Type-Guards)
  ├── rate-limit: 3/min/IP (in-memory)
  ├── cache-key: vision::<id>::<style>::<season>::v1
  │
  ├── Cache-Hit?
  │   ├── Memory-Cache (LRU 64)
  │   └── Vercel Blob (wenn BLOB_READ_WRITE_TOKEN gesetzt)
  │
  ├── Cache-Miss?
  │   ├── OpenAI Images Generate: model=gpt-image-1, 1024×1024, quality=high
  │   ├── Response: b64_json → dataUrl
  │   └── Cache.put(dataUrl)
  │
  └── return { dataUrl, cached, promptUsed, durationMs }
```

## Bundle-Strategie

- `WeltShell` ist `"use client"`, aber **kein Default-Export**, also nur on-route geladen.
- `WeltCanvas` ist `next/dynamic` mit `ssr: false` → kein Server-Side-Bundle-Impact für 3d-tiles / Three.
- Main-Bundle (Index `/`) bleibt unverändert.

## Fehler-Pfade

- **Kein Google-Key** → `<WeltUnavailable reason="googleTiles" />` mit Setup-Hinweis.
- **Kein WebGL** → `<WeltUnavailable reason="webgl" />` mit Browser-Hinweis.
- **Splat-Load-Fail** → Marker bleibt sichtbar, kein Crash.
- **Tile-Stream-Fail** (z. B. Quota überschritten) → Console-Log, Tile-Cache leer, FPS bleibt aber bei 60 (Skybox + ENU-Frame ist konstant).
- **Vision-API-Fail** → JSON-Error mit `message`, UI rendert Toast + roter Banner.

## Why no R3F (React Three Fiber)?

Geprüft, bewusst dagegen entschieden:
- 3d-tiles-renderer hat zwar einen `r3f`-Bridge, aber Pointer-Lock + WASD-Loop sind imperativ am elegantesten direkt auf der Camera.
- Vermeidet zusätzliche Bundle-Größe (~50 kB R3F-Runtime).
- Cleanup ist klar (`dispose()` in Effekt-cleanup).
