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

## #011 — Spark 2.0 Peer-Dep auf Three.js 0.180, Projekt nutzt 0.184

**Trigger**: `npm install @sparkjsdev/spark` schlägt fehl mit `peerDependencies` Konflikt — Spark 2.0.0 deklariert `three: ^0.180.0`, das Projekt steht auf `three@^0.184.0`.

**Symptom**:
```
npm error code ERESOLVE
npm error Could not resolve dependency:
npm error peer three@"^0.180.0" from @sparkjsdev/spark@2.0.0
```

**Fix**: `npm install --legacy-peer-deps @sparkjsdev/spark`. Spark 2.0 läuft in der Praxis stabil mit Three.js 0.184 — die Peer-Range bei `^0.180.0` ist konservativ und schließt Minor-Bumps auf gleicher Major-Version (0.x) zu strikt aus.

**Prevention**: In `.npmrc` `legacy-peer-deps=true` global aktivieren ist eine Option, aber zu invasiv für ein Multi-Lib-Projekt. Stattdessen: `--legacy-peer-deps` nur bei dem einen `install`-Call, und in `package.json` als `npm install` deferred (die `node_modules` sind nach erstem Lauf konsistent, `npm ci` braucht `--legacy-peer-deps` per CI-env-var).

## #012 — Marble lehnt URL-Bilder von Wikipedia/Unsplash ab

**Trigger**: Phase-0 Smoke-Test mit `multi_image_prompt[].content.source = "uri"` und Wikimedia-/Unsplash-URLs liefert `Failed to download asset`.

**Symptom**:
```json
{"detail": "Failed to download asset from https://upload.wikimedia.org/.../foo.jpg. Please check the URL and try again."}
```

**Fix**: Immer den `prepare_upload`-Pfad nehmen — also (a) `POST /marble/v1/media-assets:prepare_upload` für jede Datei, (b) PUT auf die signed URL, (c) `worlds:generate` mit `source: "media_asset", media_asset_id: …`. Das ist sowieso der Production-Pfad, weil unsere Capture-Photos direkt aus dem Browser kommen und nicht extern referenzierbar sind.

**Prevention**: Im `MarbleClient` wird `uri`-Source gar nicht erst angeboten — nur `media_asset`. Für lokale Test-Skripte: `curl -L` herunterladen, dann uploaden, niemals `uri` an Marble durchreichen.

## #013 — Vercel Hobby cappt Cron-Jobs auf 1×/Tag (silent deploy-reject)

**Trigger**: `vercel.json` mit `"schedule": "*/1 * * * *"` deployed auf einen Hobby-Plan-Account.

**Symptom**: Jeder GitHub-Push zu `main` triggerte den Webhook, aber **kein neuer Deployment** tauchte im Dashboard auf. Letzter Production-Deploy stand 23h auf einem alten Commit fest. Erst der manuelle `vercel deploy --prod` aus dem CLI lieferte die echte Fehlermeldung:

```json
{
  "status": "error",
  "reason": "deploy_failed",
  "message": "Hobby accounts are limited to daily cron jobs. This cron expression (*/1 * * * *) would run more than once per day. Upgrade to the Pro plan to unlock all Cron Jobs features on Vercel."
}
```

Der Webhook-getriggerte Build wurde sofort und unsichtbar verworfen, ohne den Deploy in der UI als „Failed" anzuzeigen — das verschleiert die Root-Cause komplett.

**Fix** (commit `6991433`): Zwei-Schichten-Polling.

1. `vercel.json` Cron auf `0 4 * * *` (Tages-Sweep nachts 04:00 UTC) — innerhalb Hobby-Limit.
2. Neue `lib/marble/poll.ts:pollCustomerPendingOps(customerId)` extrahiert per-customer-Polling.
3. `/api/capture/status` ruft `pollCustomerPendingOps` lazy auf wenn `status === "processing"`. Solange ein Browser pollt (Status-Endpoint alle 5–30 s), pollt der Server bei jedem Read auch Marble.
4. `/api/capture/poll` (Cron) bleibt als Fallback-Sweep für Tabs, die mid-processing geschlossen wurden, aber nutzt jetzt dieselbe `pollCustomerPendingOps`-Funktion (DRY).

**Prevention**:
- **Vor jedem Cron-Schedule-Add**: Plan-Tier des Vercel-Accounts checken. Hobby = 1×/Tag (`0 H * * *`), Pro = beliebig.
- **Wenn Auto-Deploy stumm bleibt**: Direkt `vercel deploy --prod` lokal versuchen — die CLI zeigt strukturierte Fehler, die der Webhook-Workflow verschluckt.
- **Architektur-Pattern**: Polling immer client-getrieben designen wenn der Use-Case ein Browser-User mit offenem Tab ist. Server-Cron ist Fallback, nicht Primärquelle.

## #014 — `AzimuthCompass` „kalibriert sich…" auf Geräten ohne Magnetometer

**Trigger**: User ruft `/capture/c-XXX` auf einem Desktop-Browser (kein Hardware-Sensor) oder einem Android-Gerät ohne Magnetometer auf. Permission-State steht auf `granted` (kein iOS-Prompt nötig), `addEventListener("deviceorientation", …)` wird installiert — aber das Event feuert nie.

**Symptom**: UI bleibt unbegrenzt auf „Kompass kalibriert sich…" (Spinner-Komponente in `azimuth-compass.tsx`), kein Fallback, kein Manual-Override sichtbar. User ist gestuck.

Bonus-Sub-Problem: Auf Android Chrome liefert `deviceorientation` zwar Events, aber `event.alpha` ist relativ zur Page-Load-Orientierung, nicht zum magnetischen Norden — kein Kompass-Fallback per `(360 - alpha) % 360` möglich.

**Fix** (commit `1942d0e`):

1. **No-Signal-Timeout (6 s)**: `setTimeout` parallel zum `addEventListener`. Wenn nach 6 s kein Event eingetroffen ist (`received` Flag bleibt `false`), wird `onUnsupported()` getriggert → Parent schaltet auf `ManualAzimuthSelector`.
2. **Android: `deviceorientationabsolute` first**: Feature-Detection via `"ondeviceorientationabsolute" in window`. Das absolute Event garantiert magnetisch-Norden-relative Alpha-Werte. Fallback auf normales `deviceorientation` für iOS/Firefox.
3. **„Manuell ausrichten"-Button in jedem State**: Der Spinner-State, der Permission-Prompt-State und der aktive Compass-State haben jetzt alle einen Underline-Link, mit dem der User sofort zu Manual-Mode wechseln kann ohne den Timeout abzuwarten.
4. **NaN/undefined-Filter**: Heading wird nur gesetzt wenn `Number.isFinite(compass)` — verhindert dass ein einziges defektes Event den Spinner stoppt aber dann garbage rendert.

**Prevention**:
- **Sensor-Komponenten brauchen IMMER**: (a) Permission-Handling, (b) No-Signal-Timeout mit Fallback, (c) sichtbarer Manual-Escape in jedem State, (d) Feature-Detection für `*absolute`-Event-Varianten auf Android.
- **Test-Strategie für DeviceOrientationEvent**: Lässt sich kaum unit-testen (braucht echtes Hardware-Event). Stattdessen: E2E-Test, der den Timeout-Pfad explizit triggert (Mock-Event-Listener nicht aufrufen) und prüft, dass nach 6 s `useManualSelector === true` wird.
- **UX-Regel**: Jeder unbestimmte Loading-State (Spinner ohne progress) braucht entweder einen sichtbaren Cancel-Button oder einen Auto-Timeout. „Forever spinner" ist ein Bug, kein State.

## #015 — Vitest race zwischen Tests die denselben File-Cache schreiben

**Trigger**: `lib/__tests__/splat-store.test.ts` und `lib/__tests__/marble-poll.test.ts` schreiben beide in `.cache/splat-mappings.json` (der Local-Fallback wenn `BLOB_READ_WRITE_TOKEN` fehlt). Vitest läuft files parallel by default → einer der beiden bleibt mit truncated/raced state zurück.

**Symptom**: `summarisePendingOps flattens across customers` failed sporadisch mit „received array contains only c-002 entries", obwohl der Test isoliert (`vitest run lib/__tests__/splat-store.test.ts`) immer grün ist.

**Fix** (vitest.config.ts): `fileParallelism: false` setzen. Dauert ~24 s länger pro Suite-Run (29s vs 5s), aber stabil.

**Prevention**:
- **Wenn ein Test einen module-scoped Cache oder einen geteilten Filesystem-Pfad benutzt**: entweder mocken oder `fileParallelism: false`.
- **Bessere Langzeit-Lösung** (nicht jetzt nötig): `splat-store.ts` würde eine env-Variable `SPLAT_STORE_LOCAL_CACHE_PATH` lesen, die per Test-File auf einen unique tmp-Pfad gesetzt wird. Dann könnte parallelism wieder an.
- **Diagnostik-Heuristik**: „Test grün isoliert, rot in Suite" → fast immer ein Race auf shared module state oder shared FS. Erst clearAllMappings/beforeEach checken, dann fileParallelism ausschließen.

## #016 — Marble-SPZ-Welten rendern auf dem Kopf (OpenCV vs OpenGL Koordinaten)

**Trigger**: Marble exportiert seine SPZ-Splats im **OpenCV-Koordinatensystem** (`+X` rechts, `+Y` **unten**, `+Z` **vorne**). Three.js / Spark erwarten OpenGL-Konvention (`+X` rechts, `+Y` **oben**, `−Z` vorne). Ohne Konvertierung steht jede generierte Welt im SplatViewer kopf, und der Spawn liegt am `boundingBox.center + (0, 0, radius * 1.6)` — also **außerhalb** der eigentlichen Welt — was bei OrbitControls noch akzeptabel ist, bei einer „Begehung" aber komplett falsch.

Quelle: `docs.worldlabs.ai/marble/export/specs` — *„Default world labs worlds are in OpenCV coordinate system (+x right, +y down, +z forward). To correct for OpenGL software, scale Y and Z axes by −1."*

**Symptom**:

- Bild steht **auf dem Kopf** im `/welt/[customerId]`-Viewer (Himmel unten, Boden oben).
- Kamera spawnt **außerhalb der Welt**, sodass der User auf das Splat von außen schaut statt drin zu stehen.
- Drücken einer Bewegungstaste passierte nichts, weil `OrbitControls` keine WASD-Bewegung kennt — sie orbiten nur um `target`.

**Fix** (commit folgt nach diesem Eintrag):

1. **Koordinaten-Flip**: `splatMesh.rotation.x = Math.PI` direkt nach der `new SplatMesh()`-Konstruktion, **bevor** `scene.add(splatMesh)`. Das ist mathematisch identisch zum Y/Z-Scale-Flip (`scale.set(1, -1, -1)`), aber sicherer für Splat-Quaternionen — Three.js komponiert die Rotation in die Object3D-Matrix, ohne die einzelnen Splat-Orientierungen umkehren zu müssen.

2. **`OrbitControls` → `FirstPersonControls`** (wiederverwendet aus `welt-canvas.tsx`): WASD + Maus auf Desktop, Touch-Drag + `TouchJoystick` auf Mobile. Pointer-Lock-Pattern wie in der Google-Tiles-Welt.

3. **Spawn IN der Welt, nicht außerhalb**: `camera.position.set(0, 0, 0)` direkt am Marble-Origin. Der Capture-Standpunkt (wo der Photograph stand) liegt per Konvention bei Marble's Origin und bleibt nach der X-Rotation um π exakt dort. **Achtung — frühere Annahme war falsch**: ich hatte erst `(center.x, max.y − 1.6, center.z)` geschrieben mit der Begründung „Boden landet bei `box.max.y` nach OpenCV→OpenGL-Flip", aber das stimmt nicht — OpenCV hat +Y nach unten, also ist der Boden im OpenCV-Frame bei großem +Y, und `(x, y, z) → (x, −y, −z)` mapt das auf großes **negatives** Y in Three.js = `box.min.y`. `max.y − 1.6` setzte den Eye dadurch knapp unter den Welt-Himmel, weit über jedem Splat-Cluster, und der User sah die Welt von oben/außen statt mittendrin. Spawn am Origin ist robust gegen jedes Bounds-Layout.

4. **Camera-Quaternion über `Matrix4.lookAt` darf den Target NICHT spiegeln**: Three.js' `Matrix4.lookAt(eye, target, up)` baut intern `z-axis = eye − target` und die Kamera-Forward ist `−Z_local`. Wenn man `target = lookDir.clone().multiplyScalar(−1)` füttert, zeigt `−Z_local` auf `−(−lookDir) = +lookDir`… wait — auf `−lookDir` (siehe Three.js source: `_v1.subVectors(eye, target)` mit eye=0, target=−lookDir → z=+lookDir → camera schaut entlang `−Z_local = −lookDir`). Resultat: Kamera schaut in die **entgegengesetzte Richtung** von dem, was Movement (`forward`, `right`) annimmt. W bewegt vorwärts, aber die Kamera sieht rückwärts → User fühlt sich „rückwärts gehen", A/D vertauscht, Maus-X gespiegelt. Fix: `target = lookDir` ohne Negation.

5. **Fly-Mode by default** (`controls.flyMode = true`): Marble-SPZ-Welten haben **keinen watertight Floor-Mesh**, sondern nur Punktwolken — wenn wir einen Y-Clamp auf Ground-Raycast einbauen, schwebt der Avatar an zufälligen Splat-Punkten herum. Fly-Mode mit Space / Q-E für vertikale Bewegung ist die richtige Default-UX für eine Tour-Demo. Floor-Clamp ist nur dann sinnvoll, wenn die Welt aus echter Mesh-Geometrie besteht (z.B. die Google-3D-Tiles in `welt-canvas`).

6. **Click-to-lock-Hint** als Overlay: User sieht nach dem Splat-Load „In die Welt klicken zum Begehen — WASD bewegen, Maus schauen, Shift sprintet, Q/E hoch/runter, ESC verlässt". Pointer-Lock-Cancel via ESC ist Browser-Standard.

**Prevention**:

- **Vor jeder neuen Splat-Quelle (Marble, Luma, Polycam, Scaniverse, …)**: Coordinate-System der Quelle dokumentieren. Default-Annahme „Y-up wie Three.js" ist falsch für mindestens Marble, ROS-Bags, OpenCV-Pipelines und Photogrammetrie aus Photogrammetry-DCC-Tools mit Z-up.
- **Splat-Viewer-Checklist**: (a) Coordinate-Flip dokumentiert, (b) Kamera-Spawn ist visuell verifiziert innerhalb der Welt, (c) Controls passen zum Use-Case (orbit-around-object vs walk-inside-world), (d) Fly-mode wenn kein Floor existiert.
- **Klassischer Smell**: Wenn man im Splat-Viewer ein 3D-Modell von außen sieht aber das Modell „eigentlich begehbar" sein soll → fast garantiert ein Spawn-außerhalb-bounds-Problem oder das falsche Control-Schema (OrbitControls statt FirstPerson).

## #017 — Vercel Serverless Function `FUNCTION_PAYLOAD_TOO_LARGE` bei 8-Foto-Upload

**Trigger**: User uploaded 8 Outdoor-Fotos (~2 MB JPEG each, JPG q=0.85 / 2048 px) als FormData an `/api/capture/start`. Total payload ~16 MB.

**Symptom**: Vercel Edge response:
```
Etwas ist schiefgelaufen
Request Entity Too Large
FUNCTION_PAYLOAD_TOO_LARGE fra1::xcndk-1778951197750-17188761438f
```
Lokal mit `next dev` reproduzierbar nicht — der Limit ist eine Vercel-Edge-Property.

**Root-Cause**: Vercel Serverless Functions haben ein **hartes 4.5-MB-Limit auf den Request-Body** (egal ob `nodejs` oder `edge` runtime, egal welcher Plan). Das Limit greift _vor_ deinem Handler in der Vercel-Edge — `maxDuration` o.Ä. helfen nichts.

Quelle: <https://vercel.com/docs/functions/limitations#request-body-size>

**Workaround**, der NICHT gewählt wurde:
- Aggressivere Compression (z.B. 1280 px / q=0.6) → reduziert die Qualität, sprengt das Limit aber bei 8 Bildern immer noch knapp.
- Vercel Pro Plan → kein Unlimit, nur leicht höher.

**Fix** (commit folgt — Two-Step Direct-Upload):

1. **Neuer Endpoint** `POST /api/capture/prepare`: nimmt JSON `{customerId, files:[{slot, extension, azimuth}…]}`. Ruft Marble `prepareUpload` N× parallel auf, gibt `{uploads: [{slot, mediaAssetId, uploadUrl, uploadMethod, requiredHeaders}…]}` zurück. Cost-Cap-Pre-Check inkl.
2. **Browser** PUTet jedes Foto direkt zu `uploadUrl` (Google-Cloud-Storage signed URL). CORS ist von World-Labs konfiguriert (`Access-Control-Allow-Origin: https://…vercel.app`, verifiziert via OPTIONS-Probe). PUTs laufen parallel mit kleinem Retry-Helper.
3. **Modifizierter Endpoint** `POST /api/capture/start` akzeptiert jetzt JSON mit `{customerId, size, mode, reconstruct, slots:[{slot, azimuth, elevation, position, mediaAssetId}…]}` statt FormData. Triggert nur noch `generateWorld` mit den vorher hochgeladenen `mediaAssetId`s. Payload < 2 KB.

**Daten-Flow neu**:
```
Browser ──prepare──► Vercel /api/capture/prepare
                       └──prepareUpload×N──► Marble
                       ◄──{mediaAssetId,uploadUrl}×N──
Browser ──PUT×N (parallel)──► storage.googleapis.com (signed URLs)
Browser ──start──► Vercel /api/capture/start
                       └──worlds:generate──► Marble
                       ◄──{operationId}──
```

Vercel sieht damit nie mehr als ~5 KB JSON. Limit ist permanent eliminiert; Marble-File-Limit ist 100 MB/Bild.

**Prevention**:

- **Niemals File-Uploads durch eine Vercel-Function pipen**, wenn der Cloud-Provider signed Upload-URLs anbietet (Marble, S3, Vercel-Blob, Cloudflare-R2 — alle haben dieses Pattern). Browser → Storage direkt ist immer der bessere Pfad, weil:
  - Kein 4.5-MB-Limit
  - Keine doppelte Bandwidth (Egress = teuerste Vercel-Resource)
  - Parallel-Uploads ohne Function-Concurrency-Constraints
  - Längere Operations möglich (Vercel-Function-Timeout fällt weg)
- **CORS vorher prüfen**: Vor dem Switch zu Direct-Upload mit `curl -X OPTIONS -H "Origin: …" -H "Access-Control-Request-Method: PUT"` gegen die signed URL ihres Providers. Wenn `Access-Control-Allow-Origin` matched → grün.
- **Rate-Limit auf den teuren Endpoint legen** (nicht auf den Prepare-Endpoint): `/api/capture/start` triggert die ~1,18 €-Marble-Generation; das ist der echte Cost-Vector. `/api/capture/prepare` ist signed-URL-Generation, fast gratis — der Customer-Whitelist-Check reicht dort.
- **Test-Script idea (TBD)**: Ein E2E-Test der 8×3-MB-Dummy-Fotos an `/prepare` schickt und einen einzelnen PUT verifiziert (ohne Marble-Generation). So wird das Limit-Regression beim nächsten Refactor entdeckt.
