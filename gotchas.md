# gotchas.md — Lessons Learned

Werkbank-Notizen aus dem autonomen Build. Jeder Eintrag: Trigger, Symptom, Fix, Prevention.

## #001 — npm naming restriction bei Ordnern mit Leerzeichen

**Trigger**: `npx create-next-app@latest .` im Ordner `Experiment StammKundenMap/`.
**Symptom**: `name can only contain URL-friendly characters; name can no longer contain capital letters`.
**Fix**: Subfolder mit url-safe Name (`stammkundenmap-gaigg`) anlegen und dort scaffolden.
**Prevention**: Bei Windows-Workspaces mit Marketing-Namen immer einen url-safe Subfolder für den Code anlegen.

## #002 — @lumaai/luma-web Peer-Conflict mit aktuellem @types/three

**Trigger**: `npm install` mit `@types/three@latest` und `@lumaai/luma-web@^0.2`.
**Symptom**: `ERESOLVE could not resolve. peer @types/three@"^0.157.2" from @lumaai/luma-web`.
**Fix**: `.npmrc` mit `legacy-peer-deps=true` in Project-Root. Funktional kein Problem — Luma Web ist Typen-tolerant gegenüber Three-Updates.
**Prevention**: Bei jedem Splat/3D-Library-Upgrade peerDep-Checks. Wenn Luma-Web ein Minor-Update kriegt, peer-deps neu prüfen.

## #003 — Mapbox GL JS v3 `_checkLoaded` Race auf Initial-Mount

**Trigger**: In `MapCanvas` ruft ein zweiter `useEffect([mapStyle])` direkt `instance.getStyle()?.sprite` auf, um zu entscheiden, ob ein Style-Switch nötig ist. Beim **initial mount** ist der Style aber noch im async-Loading-State.
**Symptom**:

```
Uncaught Error: Style is not done loading
  at iL._checkLoaded
  at iL.serialize
  at Map.getStyle
```

React-Tree crashed silent, Chromium zeigt nur die generische „This page couldn't load"-Page — kein Hinweis im Network-Tab, nur in der Console. Lokaler Build war komplett clean, weil der Bug erst im Browser im Race-Window auftritt.

**Fix** (commit `f9076e2`):

1. `lastStyleKeyRef`-Pattern: Der zweite Effect macht ein early-return wenn `lastStyleKeyRef.current === mapStyle`. Beim initial mount sind beide identisch → `setStyle()` wird übersprungen.
2. Initial-Map-Config (`mapStyle`, `isIntroComplete`) über `useRef` gecaptured, statt als Effect-Deps → die Mapbox-Instanz wird genau einmal pro Component-Lifetime gebaut. Vorher hätte ein Style-Switch die ganze Map zerstört + neu gebaut.
3. `three-d-buildings-layer.tsx` zusätzlich mit `map.isStyleLoaded()` plus try/catch um den `getStyle()`-Call gewrappt — Belt-and-Suspenders, falls Mapbox-Internals während eines Style-Switches kurz transitional sind.
4. Error-Handler (`onError`) im map-canvas prüft `instance.isStyleLoaded()` bevor er `getStyle()?.name` für die Standard-Style-Detection ausliest.

**Prevention**:

- **Mapbox v3 Regel**: `map.getStyle()`, `map.getLayer()`, `map.getSource()`, `map.setLayoutProperty()`, `map.setPaintProperty()` **niemals** im selben Tick wie `new Map(…)` oder `map.setStyle(…)` aufrufen. Immer entweder in `map.on('style.load', …)` oder hinter einem `map.isStyleLoaded()`-Gate.
- **Effect-Deps minimal halten**: Long-lived Imperative-Library-Instances (Mapbox, Three, Player-SDKs) gehören in einen `useEffect` mit nur stable deps; alle veränderlichen Werte via Refs reinholen.
- **Browser-Test ist Pflicht vor Production-Sign-off**: Server-side curl + Lighthouse hatten den Bug nicht erwischt (Static HTML rendert ja, der Crash war erst beim Client-JS-Init). Lehre: Vor „done" mindestens 1× DevTools-Console-Check auf Production-URL.

## #004 — PWA-Manifest `sizes: "any"` mit `image/png`

**Trigger**: `app/manifest.ts` deklarierte Icon-Source `"/icon"` mit `sizes: "any"` und `type: "image/png"`.
**Symptom**: Chromium-DevTools-Console:

```
Error while trying to use the following icon from the Manifest:
  https://…/icon (Resource size is not correct - typo in the Manifest?)
```

**Fix**: `sizes: "any"` ist per W3C-Spec für **Vector**-Formate reserviert. Für Raster (PNG/JPEG) müssen konkrete Pixel-Dimensionen angegeben werden, die mit der ausgelieferten Datei matchen. Geändert auf `"64x64"`, passend zum `size` Export in `app/icon.tsx`.

**Prevention**: Beim Hinzufügen neuer Icon-Routen die Größen im Manifest und in der Icon-Source-Datei explizit aufeinander abstimmen. Wenn das Format wechselt: Manifest mitziehen.
