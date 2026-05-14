# Welt-Setup — Google Photorealistic 3D Tiles + OpenAI Vision

Dieser Guide führt durch die nötigen Cloud-Konsolen-Schritte für die Welt-Route. Die Konfiguration ist einmalig pro Environment (Production, Preview, Local) und dauert ~10 Minuten.

## 1. Google Map Tiles API

> Ergebnis: ein **HTTP-Referrer-restricted Browser-Key** mit Quota-Cap, für die Photorealistic 3D Tiles.

1. Öffne <https://console.cloud.google.com/> und logge dich ein.
2. Projekt erstellen oder bestehendes wählen, z. B. `gaigg-stammkundenmap`.
3. Im Sidebar-Menü → **APIs & Services** → **Library** → "Map Tiles API" suchen → **Enable**.
4. Billing-Konto verknüpfen (Pflicht für 3D-Tiles-SKU). Free-Tier: 1.000 Root-Tile-Sessions/Monat (Enterprise).
5. **APIs & Services** → **Credentials** → **Create Credentials** → **API key** → Restrictions setzen:
   - **Application restrictions**: HTTP referrers (web sites). Add:
     - `http://localhost:*` (Local-Dev)
     - `http://localhost:*/*`
     - `https://*.vercel.app/*` (Preview-Deploys)
     - `https://stammkundenmap-gaigg.vercel.app/*` (Production)
     - Deine eigene Domain, falls verlinkt
   - **API restrictions**: Restrict key → "Map Tiles API" auswählen.
6. **APIs & Services** → **Quotas & System Limits** → "Map Tiles API" → Daily-Cap setzen (z. B. 5.000 Sessions/Tag) zur Cost-Sicherheit.
7. Den Key kopieren und als `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` setzen:
   - Local: `.env.local`
   - Vercel: Dashboard → Settings → Environment Variables → für Production / Preview / Development hinterlegen (3 separate Keys mit jeweils passendem Referrer-Restriction sind möglich, aber meist reicht ein gemeinsamer Key mit allen Referrern).

## 2. OpenAI Images API (gpt-image-1)

> Ergebnis: ein **server-only Restricted Key** für die Vision-Generierung.

1. <https://platform.openai.com/api-keys> → **Create new secret key** → Type **Restricted**.
2. Permissions:
   - **Images: Write**
   - Alle anderen: **No access**
3. Key kopieren — er wird nur jetzt gezeigt.
4. <https://platform.openai.com/account/billing/limits> → Monthly budget setzen (z. B. 20 USD) und Soft-/Hard-Cap aktivieren.
5. Optional: separater Project-Scope für `stammkundenmap` zur Cost-Trennung.
6. Key in `.env.local` und Vercel als `OPENAI_API_KEY` setzen. **Wichtig**: in Vercel als **Sensitive** markieren (Settings → Environment Variables → "Sensitive" Toggle).

> ⚠️ `OPENAI_API_KEY` ist **kein** `NEXT_PUBLIC_*` — wird ausschließlich vom Server-Endpoint `app/api/vision/generate/route.ts` gelesen. Es darf niemals in den Client-Bundle wandern.

## 3. Vercel Blob (Production-Cache)

> Optional, aber empfohlen für Production. Im Dev fällt der Code automatisch auf einen In-Memory-Cache zurück.

1. Vercel-Dashboard → Storage → **Create** → Vercel Blob → Name z. B. `vision-cache`.
2. Im Tab "Quickstart" sieht man den Token-String — dieser wird automatisch in Production-Deploys als `BLOB_READ_WRITE_TOKEN` injected.
3. Für Local-Dev kann derselbe Token in `.env.local` als `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_…` gespeichert werden, falls man den Cache-Pfad testen möchte. Sonst leer lassen.

## 4. Optionale Cost-Hard-Caps

In `.env.local` und Vercel-Env können diese Werte gesetzt werden:

```dotenv
OPENAI_DAILY_BUDGET_USD=2.00
GOOGLE_TILES_DAILY_SESSION_CAP=2000
```

Sie sind UI-Hinweise + zukünftige Server-Side-Guards. Aktuell rate-limited der Vision-Endpoint zusätzlich auf 3 Requests/Minute/IP.

## 5. Verifikation

```bash
# 1. Local Dev
npm run dev
# → http://localhost:3000/welt/c-001 → Welt sollte streamen, "© Google" sichtbar.

# 2. Production-Build
npm run build && npm run start
# → /welt/c-001 lädt das Static-OG + Dynamic-Welt-Shell.

# 3. Vision API
curl http://localhost:3000/api/vision/generate
# → {"ok":true,"info":"POST { customerId, style, season } → ..."}
```

## 6. Troubleshooting

| Symptom | Vermutete Ursache | Fix |
|---|---|---|
| Welt zeigt "API-Keys werden konfiguriert" | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` fehlt | Key in `.env.local` / Vercel-Env setzen, Server neu starten |
| Tiles laden nicht, Console-403 | Referrer-Restriction matcht nicht | Domain in Google-Cloud-Console-Restriction ergänzen |
| Vision-Tab disabled | `OPENAI_API_KEY` fehlt server-seitig | Key als **Sensitive** in Vercel hinzufügen, redeployen |
| `429 rate_limited` | Mehr als 3 Vision-Requests/min/IP | 60 s warten, dann erneut |
| Vision-Image kommt langsam zurück | gpt-image-1 brauche initial 8–15 s | Cache-Hit beim zweiten Aufruf macht es < 200 ms |
| `503 openai_not_configured` | Server-Key fehlt | siehe oben |
