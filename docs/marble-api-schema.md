# Marble API Schema Reference (verified 2026-05-15)

> Compact reference for the World Labs Marble API as it actually behaves in Phase-0 smoke testing. Generated from the OpenAPI spec at https://docs.worldlabs.ai/api/reference/openapi.yaml plus a real round-trip with `WORLDLABS_API_KEY`.
>
> If something here disagrees with the upstream YAML in `docs/marble-openapi.yaml`, the upstream YAML wins. Update this file when API behaviour drifts.

## Auth

```
Header: WLT-Api-Key: <key>
Base:   https://api.worldlabs.ai
```

## Hard limits (verified)

| Limit | Value | Source |
|---|---|---|
| Multi-image: default max images | **4** | OpenAPI `MultiImagePrompt-Input.reconstruct_images=false` |
| Multi-image: with `reconstruct_images: true` | **8** | Same — explicit field doc |
| Per-file upload size | **100 MB** | `x-goog-content-length-range: 0,104857600` (verified) |
| Signed-upload-URL TTL | **1 hour** | `X-Goog-Expires=3600` |
| Rate limit (world generation) | **~6 starts / minute / user** | `docs/marble-rate-limits.md` |
| Generation latency | 30 s (draft) — 5 min (standard/plus) | Smoke = 28 s for `marble-1.0-draft` |

## Pricing (`docs/marble-pricing.md`)

| Model | Multi-image total credits | USD ($1 = 1250 credits) | EUR (~) |
|---|---:|---:|---:|
| `marble-1.0-draft` | 250 | $0.20 | €0.18 |
| `marble-1.0` / `marble-1.1` | 1,600 | $1.28 | €1.18 |
| `marble-1.1-plus` | 1,600 – 3,100 | $1.28 – $2.48 | €1.18 – €2.28 |

→ Use `marble-1.0-draft` for E2E tests, `marble-1.1` for production VIP captures, `marble-1.1-plus` only when explicitly requested for large gardens.

## Endpoints

### 1. Prepare upload — `POST /marble/v1/media-assets:prepare_upload`

**Request:**
```json
{
  "file_name": "garden-N.jpg",
  "extension": "jpg",
  "kind": "image",
  "metadata": { "customer_id": "c-001", "azimuth": 0 }
}
```
- `file_name` ≤ 64 chars
- `kind`: `image` | `video`
- `metadata` is free-form; useful for tagging uploads with our `customer_id`/`azimuth`

**Response:**
```json
{
  "media_asset": { "media_asset_id": "uuid", "file_name": "...", "kind": "image", "extension": "jpg", "created_at": "...", "metadata": {...} },
  "upload_info": {
    "upload_url": "https://storage.googleapis.com/...?X-Goog-...",
    "upload_method": "PUT",
    "required_headers": { "x-goog-content-length-range": "0,104857600" },
    "curl_example": "curl -X PUT ..."
  }
}
```

### 2. Upload bytes — `PUT <upload_url>`

```bash
curl -X PUT \
  -H "x-goog-content-length-range: 0,104857600" \
  --upload-file garden-N.jpg \
  "<upload_url>"
```
Returns `200` on success. No body.

### 3. Generate world — `POST /marble/v1/worlds:generate`

```json
{
  "display_name": "Customer c-001 — Standort 1",
  "model": "marble-1.1",
  "tags": ["gartengestaltung-gaigg", "c-001"],
  "world_prompt": {
    "type": "multi-image",
    "multi_image_prompt": [
      { "azimuth":   0, "content": { "source": "media_asset", "media_asset_id": "..." } },
      { "azimuth":  90, "content": { "source": "media_asset", "media_asset_id": "..." } },
      { "azimuth": 180, "content": { "source": "media_asset", "media_asset_id": "..." } },
      { "azimuth": 270, "content": { "source": "media_asset", "media_asset_id": "..." } }
    ],
    "reconstruct_images": true,
    "text_prompt": "Formal garden with hedges, gravel paths, pavilion in Linz, Austria"
  }
}
```

- `azimuth`: degrees, 0=N, 90=E, 180=S, 270=W. Optional but strongly recommended.
- `reconstruct_images: true` → unlocks 5–8 images. With `false` → max 4.
- `text_prompt` optional; if omitted, the API auto-recaptions from images.
- `disable_recaption: true` keeps the user-provided text verbatim.

**Response (synchronous):**
```json
{
  "operation_id": "uuid",
  "done": false,
  "error": null,
  "metadata": null,
  "response": null,
  "created_at": "...", "updated_at": "...", "expires_at": "...",
  "cost": null
}
```

**Errors:**
- `400` invalid request / policy violation
- `402` insufficient credits → cost-cap MUST guard against this
- `422` validation error (schema mismatch)
- `429` rate-limit
- `500` server error

### 4. Poll operation — `GET /marble/v1/operations/{operation_id}`

```bash
curl https://api.worldlabs.ai/marble/v1/operations/<id> -H "WLT-Api-Key: $KEY"
```

**Response while running (`done: false`):**
```json
{
  "operation_id": "...",
  "done": false,
  "metadata": { "progress": { "status": "RUNNING", "description": "..." } }
}
```

**Response when done (`done: true`):**
```json
{
  "operation_id": "...",
  "done": true,
  "error": null,
  "metadata": {
    "progress": { "status": "SUCCEEDED", "description": "World generation completed successfully" },
    "world_id": "uuid",
    "operation_type": "world_generation",
    "public_model_name": "marble-1.0-draft"
  },
  "response": {
    "world_id": "uuid",
    "display_name": "...",
    "assets": {
      "splats": {
        "spz_urls": {
          "100k":     "https://cdn.marble.worldlabs.ai/<world_id>/<id>_<seed>_100k.spz",
          "500k":     "https://cdn.marble.worldlabs.ai/<world_id>/<id>_<seed>_500k.spz",
          "full_res": "https://cdn.marble.worldlabs.ai/<world_id>/<id>_<seed>.spz"
        }
      },
      "mesh":      { "collider_mesh_url": "https://cdn.marble.worldlabs.ai/<world_id>/<id>.glb" },
      "imagery":   { "pano_url": null /* or URL */ },
      "thumbnail_url": "https://cdn.marble.worldlabs.ai/<world_id>/<id>_mpi/thumbnail.webp",
      "caption":   "AI-generated description …"
    },
    "world_marble_url": "https://marble.worldlabs.ai/world/<world_id>",
    "permission": { "public": false, ... }
  },
  "cost": {
    "total_credits": 250,
    "line_items": [
      { "name": "Pano generation (multi-image)", "credits": 100 },
      { "name": "Draft world generation", "credits": 150 }
    ]
  }
}
```

**Failed (`done: true`, `error` non-null):**
```json
{ "done": true, "error": { "code": 4xx/5xx, "message": "..." }, "response": null }
```

### 5. Other (not used in MVP)

- `POST /marble/v1/worlds:list` — pagination, filter by status/tags/dates
- `GET /marble/v1/worlds/{world_id}` — fetch single world
- `DELETE /marble/v1/worlds/{world_id}` — remove a world
- `POST /marble/v1/pano/depth_to_rgb` — pano editing helper

## Verified file sizes (smoke test world `677fe6b4-d4ba-43ec-aba8-78ded8b51b18`)

| Tier | Size | Use |
|---|---:|---|
| `100k` | 1.23 MB | Mobile (`pointer:coarse`) |
| `500k` | 5.84 MB | Desktop default |
| `full_res` | 26.08 MB | "🔍 HQ laden" toggle |
| GLB collider mesh | (separate) | Physics/colliders only — not loaded in MVP renderer |

## Gotchas captured during Phase 0

1. **External image URLs from Wikipedia/Unsplash get `Failed to download asset`** — Marble's downloader appears to reject hot-link-protected hosts. **Always upload via `prepare_upload` + PUT**, never pass arbitrary `uri` references to `world_prompt.multi_image_prompt[].content`. (Direct CDN like Vercel Blob's public URLs *should* work, but our pipeline goes through Marble's own storage anyway.)
2. **`cost` field exists in operation response but is NOT in the OpenAPI spec** — present after `done: true`. Use it for accounting (Edge Config monthly sum).
3. **Caption is verbose and English** — fine, we don't show it to the user; could be used as alt-text or skipped.
4. **`pano_url` may be `null`** when input is multi-image (the API generates an internal pano but doesn't always expose it).
5. **Draft generation took 28 s, not 5 min** — the 5-minute estimate in `docs/marble-rate-limits.md` is for `marble-1.1` and especially `marble-1.1-plus`. Adjust ETA UI accordingly.
6. **API silently drops `display_name` when generated from media-assets in the smoke test** — response had `display_name: ""`. Workaround: also set the display_name via `PATCH /worlds/{id}` after generation, OR don't rely on it for our internal naming (we use our own `customer_id` mapping anyway).

## Reference: source files

- Full OpenAPI YAML: `docs/marble-openapi.yaml` (1655 lines)
- Endpoint deep-dive markdowns: `docs/marble-ref-*.md`
- Pricing & rate-limits: `docs/marble-pricing.md`, `docs/marble-rate-limits.md`
- Quick-start examples (Node, Python): `docs/marble-quickstart.md`
- Spark renderer guide: `docs/marble-spark-guide.md`
