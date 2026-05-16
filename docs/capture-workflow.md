# Capture-Workflow — 3D-Welt für VIP-Stammkunden

Diese Anleitung richtet sich an **Simon Geig** (Admin der StammKundenMap). Die Endkunden bekommen die fertige Welt nur zum Anschauen — Capture-Werkzeuge sind admin-only.

## Voraussetzungen

- Phone mit:
  - Aktueller Browser (Chromium 100+, Safari iOS 16+, Firefox 110+)
  - Funktionierender Rückkamera
  - Bewegungssensor (Kompass) — optional, manueller Fallback ist eingebaut
- Vercel Password Protection eingerichtet (du loggst dich einmal ein, Cookie hält 30 Tage)
- Stabile Mobil-Daten (4G genügt für 8 × ~600 KB = ~5 MB Upload)

## Schritt für Schritt — Phone-Capture vor Ort

1. **App öffnen → einloggen** (Vercel-Standard-Login)
2. **Kunden in der Karte antippen** → Detail-Panel rechts klappt auf
3. Im Detail-Panel auf **"📷 3D-Welt erstellen"** tippen
   *Falls schon eine Welt existiert: "Standort hinzufügen" → für große Gärten Multi-World*
4. Auf der Capture-Seite (`/capture/[customerId]`):
   - **Modus**: "Mit Phone capturen"
   - **Garten-Größe**:
     - **Klein (4 Fotos)** — Reihenhausgarten, Innenhof, kompaktes Anwesen ≤ 300 m²
     - **Mittel (8 Fotos)** — Standardvilla, 300–800 m² *(Empfohlene Standardgröße)*
     - **Groß (8 + Multi-World)** — Park, Anwesen >800 m² → mehrere Welten von verschiedenen Standorten
5. **Fotos schießen** — der Kompass leitet dich:
   - Stelle dich in die Mitte des relevanten Bereichs
   - Drehe dich, bis der Pfeil grün wird (= du blickst in die Zielrichtung)
   - Tippe **"Foto auslösen"**
   - Auto-Advance zum nächsten Slot
6. **"🌍 3D-Welt erstellen"** tippen wenn alle Slots gefüllt sind (sonst grau)
7. Marble verarbeitet — **du kannst das Tab schließen**, der Status wird gespeichert
8. **~5 Minuten später**: Detail-Panel zeigt "3D-Welt verfügbar" → Button **"🎥 3D-Tour begehen"** → öffnet `/welt/[customerId]` mit Spark-Splat-Renderer

## Schritt für Schritt — Drohnen-/Upload-Modus

Wenn du Material vom Kunden bekommst, oder selbst mit der Drohne fotografierst:

1. **"Eigene Fotos hochladen"** statt "Mit Phone"
2. Pro Slot:
   - Slot-Selector wählen (z.B. "Slot 1 · 0° · Norden")
   - Himmelsrichtung-Dropdown — überschreibt EXIF-GPS-Direction
   - **"Foto auswählen"** → Datei picken
3. Wenn EXIF GPSImgDirection-Daten enthält (z.B. von Drohnen üblich), wird die Richtung automatisch übernommen
4. Wiederholen für 4 / 8 Fotos
5. Submit wie oben

## Tipps für gute Welten

- **Bewölkte Tage** sind besser als pralle Sonne (gleichmäßige Beleuchtung, keine harten Schatten)
- **Windstill** wenn viel Vegetation im Bild ist (Bewegungsunschärfe vermeiden)
- **Stabil halten** — nicht ruckeln, lieber 1 s warten und Atem anhalten
- **Nicht direkt in die Sonne** fotografieren (Lens-Flare vermasselt das Splat-Fitting)
- **Bei großen Gärten**: 2–3 Standorte mit klarem Position-Wechsel ("Standort 1: Eingang", "Standort 2: Pavillon"). Multi-World-Switcher im Viewer macht den Wechsel sichtbar
- **Aspect Ratio** sollte bei allen Fotos gleich sein (Marble braucht das im "Auto Layout"-Modus für 8 Bilder)

## Pricing pro Welt

| Modell | Bilder | Credits | USD | EUR |
|---|---:|---:|---:|---:|
| `marble-1.0-draft` (nur für Tests) | 4 | 250 | $0.20 | €0.18 |
| `marble-1.1` (Standard für VIPs) | 4–8 | 1.600 | $1.28 | €1.18 |
| `marble-1.1-plus` (Groß-Garten) | 4–8 | 1.600–3.100 | $1.28–$2.48 | €1.18–€2.28 |

→ Eine "Klein" oder "Mittel" Welt kostet immer ~€1,18.
→ Eine "Groß" Welt mit 2 Standorten kostet 2 × €2,28 = ~€4,56.

**Cost-Cap**: Soft-Warnung bei 50/Monat (Logging), Hard-Block bei 100/Monat (Edge Config).

## Troubleshooting

| Symptom | Ursache | Fix |
|---|---|---|
| Kompass zeigt nichts an | iOS Safari braucht Permission-Prompt | Auf "Kompass aktivieren" tippen, dann "Erlauben" |
| Kompass-Sensor verweigert | Altes Phone, Browser-Setting | Manueller Modus aktiviert sich automatisch — wähle Himmelsrichtung mit den 8 Buttons |
| Kamera-Bild bleibt schwarz | HTTPS nötig für `getUserMedia` | Auf Vercel-Live-URL verwenden, lokal `next dev --experimental-https` |
| Upload bricht bei langsamem Netz ab | Bilder zu groß, Mobilfunk-Lag | Browser komprimiert auf ~600 KB, sollte mit 4G klappen — sonst WLAN suchen |
| "Marble done=true aber response null" | Marble-Backend-Glitch | Capture neu starten, Marble berechnet nur erfolgreiche Welten |
| Status bleibt auf "processing" | Cron läuft nur 1×/min | Nach 6–7 Min spätestens fertig; ggf. Detail-Panel reload |
| Welt sieht zerrissen aus | Zu wenig Overlap zwischen Fotos | Beim nächsten Capture mehr Überschneidung lassen |
| "Auto Layout not working" Fehler | Aspect Ratios unterschiedlich | Bei Upload: alle Fotos gleich groß resamplen |

## Was Stammkunden sehen

- Stammkunden haben **keinen direkten Zugang** zur App (Vercel Password Protection blockt sie)
- Wenn du jemandem die Welt zeigen willst:
  - Halte ihm das Phone hin
  - Oder zeig sie am Laptop
  - Oder: füge die URL `/welt/[customerId]` als Public-Whitelist im Vercel Dashboard hinzu (nicht im MVP, siehe Bonus-Backlog)

## Tech-Hintergrund (kurz)

- **Capture-Daten** liegen lokal in IndexedDB pro `customerId` — du kannst den Browser jederzeit schließen und später am selben Phone fortsetzen
- **Fotos** werden auf max. 2048 px Edge resampled (Canvas API) und als JPEG q=0.85 hochgeladen → ~600 KB pro Bild
- **Welt-Mappings** liegen in einem zentralen JSON-Blob auf Vercel Blob (`splat-mappings.json`) — atomare Updates, gratis im Free-Tier
- **Polling** erfolgt via Vercel Cron 1×/min (siehe `vercel.json`)
- **Spark 2.0** rendert die fertigen SPZ-Splats im Browser (drei Auflösungs-Tiers: Mobile 100k, Desktop 500k, HQ full_res)

Mehr Details für Devs: siehe [marble-integration.md](./marble-integration.md).
