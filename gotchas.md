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

## #005 — Mapbox GL JS v3 dereferenziert `layer.paint` ungeguarded (Symbol-Layer ohne `paint` crashed per Frame)

**Trigger**: `customer-pin-layer.tsx` deklarierte `gaigg-pin-symbols` als `type: "symbol"` mit ausschließlich `layout`-Properties (icon-image, icon-size, icon-allow-overlap, …) — kein `paint`-Block, weil das für eine reine Icon-Symbol-Layer „nicht nötig" wirkt.

**Symptom**: 800+ Console-Exceptions pro Sekunde (~50/Frame) — sichtbar nur im Browser, lokal alles grün:

```
TypeError: Cannot read properties of undefined (reading 'paint')
  at d7._evaluateColorValue
  at d7.evaluateAllProperties
  at d7.updateFeatures
  at fX.update → b4.updateBuckets → b4.prepare → tp.prepare
  at Map._render
```

Die UI rendert weiter (Mapbox fängt den Throw intern), aber die Konsole ist geflutet, GPU spinnt auf dem Exception-Pfad, und jeder Hover/Move triggert mehr Exceptions.

**Diagnose**: Per Claude-in-Chrome JS-Eval React-Fiber traversiert, die Mapbox-`Map`-Instanz gefunden und `style.layers` enumeriert — von den 7 `gaigg-*` Layern hatte exakt einer `hasPaint: false` (`gaigg-pin-symbols`).

**Fix**: Explizites `paint`-Objekt hinzu — `icon-opacity` mit `feature-state`-Hover-Boost (0.92 → 1.0). Funktional-sinnvolle Default-Property, keine reine `paint: {}`-Pflichterfüllung.

**Prevention**:

- **Mapbox-Layer-Regel**: Jede Layer (auch Symbol-Layer mit reinen Icons) bekommt einen expliziten `paint`-Block — selbst wenn es nur eine einzige Default-Property ist. Andernfalls dereferenziert Mapbox-v3 internal `layer.paint` und crashed.
- **Production-Console-Audit ist Pflicht**: Lokaler Build und sogar `curl`/Lighthouse hatten den Bug nicht erwischt (Static HTML 200 OK, App renderte). Erst F12-Console im echten Browser zeigte die Schwere.

## #006 — `CommandDialog` ohne `<Command>`-Wrapper crashed beim ersten Öffnen

**Trigger**: shadcn-CLI scaffoldete `components/ui/command.tsx` mit einem `CommandDialog`, der `<DialogHeader>` als Sibling von `<DialogContent>` rendert UND keinen `<Command>`-Wrapper um `children` legt. cmdk's `CommandPrimitive.{Input,List,Group,Item}` benutzen `useCommandState`, das via `useContext(CommandContext)` an den Store kommen will.

**Symptom**: Beim ersten `Cmd+K`-Druck crashed die ganze React-App:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'subscribe')
  at V (cmdk chunk)
  at <react-reconciler internals>

Cascade:
  Mapbox ScaleControl.onRemove → 'off' of undefined
  (forced unmount weil React-Root tot)
```

User sieht „This page couldn't load" als generische Chromium-Error-Page — die App ist komplett weg, kein Recovery ohne Reload.

**Diagnose**: Per Claude-in-Chrome smoke-test reproduziert: Cmd+K → Crash. Stack-Trace zeigte `subscribe` von `useContext(undefined)`. shadcn-Quelle gegengelesen, dort fehlt der `<Command>` als Wrapper.

**Fix** (commit `765ca99`):

1. `<DialogHeader>` wird INSIDE `<DialogContent>` verschoben (Radix-Scope-Regel).
2. `<Command>` als Wrapper um `{children}` innerhalb des `DialogContent` — alle `CommandPrimitive.*`-Subcomponents bekommen den `CommandContext`.
3. `max-h-[80vh]`-Selektor auf `[data-slot=command]` für sauberes Scrolling im Dialog.

**Prevention**:

- shadcn-CLI-generated Code immer einmal manuell durchlesen — Preset-Templates haben gelegentlich Layout-Bugs, die bei Pure-Markup nicht auffallen, aber bei Components mit Context-Providern crashen.
- ErrorBoundary auf App-Root: Bei einem solchen Top-Level-Crash würde ein Boundary den Stack-Trace fangen und ein Recovery-UI rendern statt der nackten „This page couldn't load"-Browser-Page.

## #007 — Luma-Embed-URLs werfen still „Could not get artifacts"

**Trigger**: Demo-Splat-URLs in `lib/customers.ts` sind synthetische UUIDs (per ARCHITECTURE.md absichtlich, weil „Gartengestaltung Gaigg" eine fiktive Firma ist). Luma's Embed-Endpoint antwortet mit HTTP 200, aber der Body enthält `{"error":"Could not get artifacts"}` plus ein Mini-UI mit „This page couldn't load"-Style-Error.

**Symptom**: 3D-View-Tab zeigt im iframe einen technisch-anmutenden Error — kein App-Crash, aber Demo-UX wirkt kaputt.

**Fix** (commit `98c79c7`): `SplatIframe` macht vor dem iframe-Mount einen lightweight CORS-Fetch gegen die URL. Wenn der Body „Could not get artifacts" / „Capture not found" / `"error":"not found"` enthält, wird ein freundlicher Fallback gerendert („3D-Gaussian-Splat folgt", Kontakt-E-Mail). Bei CORS-Failure fällt der Code auf den iframe zurück, damit echte Captures unverändert funktionieren.

**Prevention**:

- Externe Embed-URLs mit User-Generated-Content immer mit einer pre-flight-Erreichbarkeits-Probe absichern, statt iframe blind zu mounten.
- Stub-IDs für Demos klar markieren (z.B. Constant `DEMO_PLACEHOLDER_SPLAT_ID`) und im Component explizit auf das Stub-Pattern testen, statt sich auf den Service-Health zu verlassen.

## #008 — Next.js 16 `params: Promise<…>` & `searchParams: Promise<…>` (Breaking)

**Trigger**: In `app/welt/[customerId]/page.tsx` und in `opengraph-image.tsx` werden Route-Parameter benötigt.

**Symptom**: Bei der gewohnten Next-≤-15-Pattern `(params: { customerId: string })` zeigt der TS-Build:

```
Type '{ params: { customerId: string }; }' is missing the following properties from type 'PageProps': params, …
```

Bzw. zur Laufzeit: `customerId` ist `undefined`, weil Next.js den Wrapper als Promise übergibt.

**Fix**: Next.js 16 macht `params` und `searchParams` zu **Promises**. Pattern:

```ts
type PageProps = {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { customerId } = await params;
  const search = await searchParams;
  …
}
```

**Prevention**: Immer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md` checken bevor man eine dynamische Route in Next 16 baut — die Doc hat das `params: Promise<…>` Pattern direkt im ersten Beispiel.

## #009 — `react-hooks/set-state-in-effect` Lint-Error bei Hydration-Detection

**Trigger**: Pattern in einer `"use client"` Komponente:

```tsx
const [webglReady, setWebglReady] = useState<boolean | null>(null);
useEffect(() => {
  setWebglReady(!!document.createElement("canvas").getContext("webgl2"));
}, []);
```

**Symptom**: `eslint-plugin-react-hooks@7` wirft `react-hooks/set-state-in-effect`-Error, weil ein synchrones `setState` im Effekt-Body Cascading Renders triggert. Build (Next.js) bricht ab, weil ESLint `--max-warnings 0` läuft.

**Fix**: **`useSyncExternalStore`** mit getServerSnapshot. Das pattern ist React-19's offizieller Weg für Hydration-Safe-Reads von Browser-APIs:

```tsx
function subscribeNoop() { return () => {}; }
function getWebglSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  return !!document.createElement("canvas").getContext("webgl2");
}
const webglReady = useSyncExternalStore(subscribeNoop, getWebglSnapshot, () => true);
```

Bei subscribable Quellen (z. B. `window.matchMedia('(pointer:coarse)').addEventListener('change', …)`) liefert man eine echte `subscribe(onChange)`-Funktion mit Event-Listener-Cleanup.

**Prevention**: Sobald eine Komponente eine Browser-Feature-Detection braucht (WebGL, matchMedia, localStorage), **direkt** zu `useSyncExternalStore` greifen statt `useEffect + setState`. Es vermeidet sowohl den Lint-Error als auch echte Hydration-Mismatches.

## #010 — `react-hooks/refs` Lint bei Render-Time-Ref-Reads

**Trigger**: Mobile-Toggle in welt-canvas las `isTouchDevice.current` im JSX:

```tsx
const isTouchDevice = useRef(false);
useEffect(() => { isTouchDevice.current = matchMedia(...).matches; }, []);
return <>{isTouchDevice.current ? <TouchJoystick /> : null}</>;
```

**Symptom**: ESLint blockiert mit `react-hooks/refs: Cannot access refs during render`. Auch funktional defekt: Beim ersten Render ist der Ref `false`, Re-Render wird nicht ausgelöst → Touch-Joystick bleibt unsichtbar.

**Fix**: Wieder `useSyncExternalStore` mit `window.matchMedia(...).addEventListener('change', onChange)` als Subscribe-Quelle. Refs sind für DOM-Knoten + mutable Werte ohne UI-Impact reserviert, nicht für rendering-relevante Booleans.

**Prevention**: Faustregel — wenn ein `ref.current`-Wert die UI beeinflusst, ist es State, kein Ref. Bei Browser-Features → `useSyncExternalStore`. Bei React-internen Daten → `useState`.
