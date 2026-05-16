# Marble + Spark Integration — Tech-Doku

Zielgruppe: Devs, die das Capture-Feature warten oder erweitern. Setup, Datenflüsse, Konfigurations-Tipps.

## Stack-Übersicht

```
[Browser /capture/<id>]                   [Server /api/capture/prepare]
       │                                          │
       │  JSON {customerId, files:[…]}            │  prepareUpload × N
       └─────────────────────────────────────────►│  → media_asset_id × N (+ signed PUT URLs)
                                                  ▼
                              { uploads:[{slot, mediaAssetId, uploadUrl,…}] }

[Browser]                                 [storage.googleapis.com]
       │  PUT photo bytes × N (parallel)          │  (Marble signed URL, CORS allows
       └─────────────────────────────────────────►│   PUT from our origin)

[Browser]                                 [Server /api/capture/start]
       │                                          │
       │  JSON {meta, slots:[…mediaAssetId]}      │  worlds:generate (multi_image)
       └─────────────────────────────────────────►│  → operation_id
                                                  │  splatStore.markProcessing()
                                                  │  costTracker.incrementMonthly()
                                                  ▼
                                          { operationId, etaSeconds }

[Vercel Cron (*/1)]                       [Server /api/capture/poll]
       │                                          │
       │  GET /api/capture/poll                   │  for each pending op:
       └─────────────────────────────────────────►│   getOperation(opId)
                                                  │   if done && response → addWorldToCustomer
                                                  │   if done && error    → markFailed

[Browser /welt/<id>]                      [Server (RSC)]
       │                                          │
       │  GET /welt/<id>                          │  getMappingForCustomer
       └─────────────────────────────────────────►│  → MarbleWeltShell (status:ready)
                                                  │     │ Spark 2.0 SplatMesh
                                                  │     │ HTTP-Range-Streaming aus
                                                  │     │ cdn.marble.worldlabs.ai
                                                  │
                                                  │  → MarbleStatusShell (processing/failed/none)
                                                  │  → WeltShell (none + Google 3D Tiles fallback)
```

## Required Environment Variables

| Var | Scope | Purpose | Format |
|---|---|---|---|
| `WORLDLABS_API_KEY` | server | Marble API auth (`WLT-Api-Key` header) | 32-char string |
| `BLOB_READ_WRITE_TOKEN` | server | Vercel Blob (splat-mappings.json) | starts `vercel_blob_rw_` |
| `EDGE_CONFIG` | server | Vercel Edge Config (cost counter) | `https://edge-config.vercel.com/<id>?token=…` |
| `VERCEL_EDGE_CONFIG_TOKEN` | server | PATCH access (write counter) | personal access token with edge-config:write |
| `VERCEL_TEAM_ID` | server (optional) | Required if Edge Config is on a team | `team_…` |
| `CRON_SECRET` | server | Vercel Cron auth header | `openssl rand -hex 32` |
| `MARBLE_MODEL_OVERRIDE` | server (optional) | `draft` to force `marble-1.0-draft` (cheap testing) | `draft` |

In `next dev` ohne diese Vars:
- `BLOB_READ_WRITE_TOKEN` Placeholder → File-Cache `.cache/splat-mappings.json` als Fallback
- `EDGE_CONFIG` Placeholder → in-memory counter, reset bei jedem Restart
- `CRON_SECRET` fehlt → Cron-Endpoint akzeptiert alle Requests (nur lokal!)

## Setup auf Vercel

1. **`vercel link`** → Projekt verbinden
2. **`vercel env add WORLDLABS_API_KEY production`** (interaktiv)
3. **Blob Store anlegen**: Vercel Dashboard → Storage → Blob → Create Store → Name `stammkundenmap-splats` → wird automatisch `BLOB_READ_WRITE_TOKEN` env var setzen
4. **Edge Config anlegen**: Storage → Edge Config → Create → Name `stammkundenmap-counters` → `EDGE_CONFIG` env var wird gesetzt
5. **`VERCEL_EDGE_CONFIG_TOKEN`** manuell setzen (Settings → Tokens → Create token mit `edge-config:write`)
6. **`vercel env add CRON_SECRET production`** mit `$(openssl rand -hex 32)`
7. **Vercel Password Protection aktivieren**: Settings → Deployment Protection → Password Protection für Production+Preview
8. **Deploy**: `vercel --prod` → vercel.json registriert automatisch den Cron

## Modules-Map

```
lib/marble/
  client.ts          MarbleClient (fetch wrapper, retries auf 429/503)
  cost-tracker.ts    Edge Config monthly counter, soft/hard caps
  types.ts           hand-typed schema, abgeleitet aus marble-openapi.yaml

lib/customers/
  splat-store.ts     Vercel Blob JSON store, lokaler File-Cache als Fallback

lib/capture/
  sequence.ts        Pure logic: generateSequence/nextTarget/validateCoverage
  image.ts           Canvas-basiertes JPEG q=0.85, max 2048 px
  storage.ts         IndexedDB-Wrapper (resume per customerId)

components/capture/  Phone+Upload-UI, Compass, Photo-Grid

components/welt/
  marble-splat-viewer.tsx   Spark 2.0 SplatMesh, Tier-Switch
  marble-welt-shell.tsx     Vollbild-Viewer mit World-Switcher
  marble-status-shell.tsx   processing/failed/none-Pfade

app/api/capture/
  prepare/route.ts   POST JSON → prepareUpload × N (signed PUT URLs für Browser)
  start/route.ts     POST JSON → generateWorld (mediaAssetIds bereits hochgeladen)
  status/route.ts    GET ?customerId → SplatMapping
  poll/route.ts      GET (cron) → walks pending ops, updates store

middleware.ts        Rate-limit auf /api/capture/start (1/customer/24h, in-memory).
                     /prepare ist absichtlich nicht rate-limited — keine Marble-Kosten.
```

## Marble API Schema-Referenz

Vollständig dokumentiert in [`marble-api-schema.md`](./marble-api-schema.md), Quelle: [`marble-openapi.yaml`](./marble-openapi.yaml).

### Wichtige Constraints

- **Max 8 Bilder pro Welt** (mit `reconstruct_images: true`); 4 Default
- **Max 100 MB pro File** (signed-URL Upload)
- **6 Generation-Starts/min/User** (Rate Limit)
- **Generation 30 s (draft) – 5 min (standard) – 6 min (plus)**
- **`spz_urls` Keys**: `100k`, `500k`, `full_res` — NICHT `splat_url` o.ä.
- **`cost` field** existiert in der Operation-Response, ist aber NICHT im OpenAPI-Spec dokumentiert

## Cron-Polling-Logik

`app/api/capture/poll/route.ts` läuft jede Minute via `vercel.json`. Pseudo-Code:

```ts
auth check (Bearer CRON_SECRET)
store = getSplatMappings(forceFresh: true)
pending = summarisePendingOps(store)  // alle (customerId, opId)
for each (customerId, operationId):
   op = client.getOperation(operationId)
   if !op.done: skip
   if op.error: markFailed(customerId, opId, msg)
   else if op.response: addWorldToCustomer(customerId, mapWorldToEntry(world), opId)
return { checked, ready, failed }
```

Fehler in einem einzelnen Customer brechen die Schleife nicht ab — nächste Iteration probiert wieder.

## Local Development

```bash
# Setup
echo "WORLDLABS_API_KEY=<dein-key>" >> .env.local
npm install
npm run dev

# Tests
npm run test                # vitest run
npm run test:watch          # vitest watch
npm run typecheck           # tsc --noEmit

# Smoke gegen echte API (kostet ~$0.20 für draft)
# Siehe docs/marble-api-schema.md "Verified file sizes" für ein Beispiel-Script
```

`next dev` schreibt Splat-Mappings in `.cache/splat-mappings.json` (Git-ignored). Du kannst die Datei direkt editieren um Mock-States zu testen — siehe Phase D Smoke-Test.

## Spark 2.0 Notes

- Peer-Dep ist `three: ^0.180.0`, wir haben `three: ^0.184.0` → Install nur mit `--legacy-peer-deps`
- `SplatMesh` lädt SPZ über `fetch` mit HTTP Range Requests — funktioniert via CDN out of the box
- **Tier-Detection**: Beim Mount wird `pointer:coarse` geprüft → Mobile bekommt 100k, Desktop 500k, manuelle Override möglich (Mobile/Standard/HQ-Buttons)
- Camera-Auto-Center: Beim `onLoad` wird die Bounding Box berechnet und die Kamera zentriert
- Auto-Orbit nach 5 s Idle (configurable)

## Sicherheit / Cost-Schutz

| Layer | Mechanism | File |
|---|---|---|
| Auth (gesamte App) | Vercel Password Protection (UI-toggle) | Vercel Dashboard |
| Rate-Limit (per customer) | 1 Capture / 24 h via in-memory Map | `middleware.ts` |
| Cost-Cap (monatlich) | Edge Config counter, Soft 50 / Hard 100 | `lib/marble/cost-tracker.ts` |
| Cron-Auth | Bearer-Token via `CRON_SECRET` | `app/api/capture/poll/route.ts` |
| Customer-Whitelist | Nur IDs aus `lib/customers.ts` akzeptiert | `app/api/capture/start/route.ts` |

## Bekannte Gotchas

1. **`next dev` braucht HTTPS** für `getUserMedia` auf nicht-localhost. Lösungen: `next dev --experimental-https` oder `mkcert`.
2. **iOS Safari `DeviceOrientation`** verlangt explizite Permission via Button-Click. Code wartet auf `requestPermission()`-Result und fällt sonst auf manuellen Modus zurück.
3. **External-URL-Bilder** (Wikipedia, Unsplash) werden von Marble's Downloader oft mit `Failed to download asset` abgelehnt. Immer den `prepare_upload`-Pfad verwenden.
4. **Spark + Three Peer-Dep-Mismatch**: Mit `--legacy-peer-deps` installieren — `three@0.184` läuft in der Praxis stabil mit Spark 2.0.
5. **Vercel 4.5-MB-Body-Limit auf Functions**: Niemals File-Uploads als FormData durch eine Vercel-Function pipen. 8 Fotos à 2 MB sprengen das hart. Lösung: Browser PUTet direkt zu Marble's signed URLs (siehe `gotchas.md #017`).

## Bonus-Backlog (nicht im MVP)

- Public-Sharing-Links für Stammkunden via signed URLs
- EU-Hosted Nerfstudio-Pipeline als DSGVO-Alternative
- Splat-Saisonen (4 Captures/Jahr → Slider)
- Vorher-Nachher (CAD vom Architekten als zweite Welt)
- Auto-Reminder für Re-Capture nach 1 Jahr
- E-Mail-Benachrichtigung an Stammkunden via Resend wenn Welt fertig
