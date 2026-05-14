# Welt-Steuerung — Cheatsheet

## Desktop

| Aktion | Eingabe |
|---|---|
| Vorwärts | `W` oder Pfeiltaste-Hoch |
| Rückwärts | `S` oder Pfeiltaste-Runter |
| Strafe links | `A` oder Pfeiltaste-Links |
| Strafe rechts | `D` oder Pfeiltaste-Rechts |
| Sprint (×2.2 Speed) | `Shift` festhalten |
| Hop / nach oben (Free-Fly) | `Space` / `E` |
| Nach unten (Free-Fly) | `Q` / `Page Down` |
| Free-Fly umschalten | `F` |
| Umsehen | Maus bewegen (nach Klick auf Canvas → Pointer Lock) |
| Pointer-Lock lösen | `ESC` |
| Pause-Menü öffnen | `ESC` |
| Zurück zur Karte | Button "Karte" oben links |

## Mobile / Touch

| Aktion | Eingabe |
|---|---|
| Bewegen | Joystick unten links ziehen |
| Umsehen | Mit einem Finger anywhere drag |
| Menü öffnen | "Menü"-Button unten rechts |

## Hotspots

- Grüner Marker in der Welt = Splat-Hotspot.
- **Klick auf Pill in der Bottom-Bar** → Smooth-Cam-Travel zum Hotspot (~1.4 s).
- Innerhalb von 24 m wird das Splat geladen (LoD-Gate).
- Beim Verlassen über 400 m wird der Splat aus dem Speicher entfernt (Memory-Sparsamkeit).

## Onboarding

- Beim ersten Besuch erscheint ein 3-Schritte-Tutorial.
- "Niemals mehr zeigen" speichert die Wahl in `localStorage` (`welt.onboarded.v1`).
- Tutorial im Pause-Menü erneut aufrufbar.
- Skip via Query-Param: `/welt/c-001?onboarding=skip`.

## Debug-Modus

- Aktiviert via Query-Param: `/welt/c-001?debug=1`.
- Zeigt FPS, Tile-Count, lat/lng-Telemetrie und einen Debug-Banner.
