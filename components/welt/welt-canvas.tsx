"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import { GoogleCloudAuthPlugin } from "3d-tiles-renderer/plugins";
import { LumaSplatsThree } from "@lumaai/luma-web";
import type { Customer } from "@/lib/customers";
import type { Hotspot } from "@/lib/welt/hotspot-registry";
import { clientEnv } from "@/lib/env";
import {
  DEG2RAD,
  RAD2DEG,
  ecefToLatLngAlt,
  latLngAltToECEF,
  spawnPoseSouthEast,
  WGS84,
} from "@/lib/welt/coordinates";
import {
  GOOGLE_TILES_ROOT,
  detectTierFromUserAgent,
  getTilesConfigForTier,
} from "@/lib/welt/tiles-config";
import {
  DEFAULT_MOTION_CONFIG,
  computeDesiredVelocity,
  integrateVelocity,
} from "@/lib/welt/motion";
import { FirstPersonControls } from "./welt-controls/first-person-controls";
import type { WeltCanvasHandle, WeltTelemetry } from "./welt-canvas-types";
import { TouchJoystick } from "./touch-joystick";

type Props = {
  customer: Customer;
  hotspots: Hotspot[];
  debug?: boolean;
  paused?: boolean;
  onTelemetry?: (telemetry: WeltTelemetry) => void;
  onHotspotEnter?: (hotspotId: string | null) => void;
  onReady?: (handle: WeltCanvasHandle) => void;
};

type HotspotRuntime = {
  hotspot: Hotspot;
  marker: THREE.Sprite;
  splat: LumaSplatsThree | null;
  splatLoaded: boolean;
  splatLoading: boolean;
  matrix: THREE.Matrix4;
  position: THREE.Vector3;
};

const TILE_SET_TIMEOUT_MS = 12_000;
const FLY_DURATION_MS = 1400;
const HOTSPOT_ENTER_RADIUS_M = 24;

export function WeltCanvas({
  customer,
  hotspots,
  debug = false,
  paused = false,
  onTelemetry,
  onHotspotEnter,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<FirstPersonControls | null>(null);
  const handleRef = useRef<WeltCanvasHandle | null>(null);
  // Mirror the paused prop into a ref so the long-lived requestAnimationFrame
  // closure (set up once per mount) can read the *current* value on every
  // frame instead of the snapshot from when the effect first ran. Without
  // this, the tick keeps treating paused as its mount-time value forever and
  // WASD motion never starts after the onboarding overlay is dismissed.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  const isTouchDevice = useSyncExternalStore(
    subscribePointerMedia,
    getPointerMediaSnapshot,
    () => false,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!clientEnv.googleMapsApiKey) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);

    const hasWebGL2 = !!document.createElement("canvas").getContext("webgl2");
    const tier = detectTierFromUserAgent({
      hardwareConcurrency: navigator.hardwareConcurrency ?? 4,
      hasWebGL2,
      isCoarsePointer: window.matchMedia("(pointer:coarse)").matches,
      deviceMemoryGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    });
    const tierConfig = getTilesConfigForTier(tier);

    const renderer = new THREE.WebGLRenderer({
      antialias: tier !== "low",
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.setClearColor(0x05080a, 1);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.outline = "none";
    renderer.domElement.tabIndex = -1;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xb6cad6, 0.000004);

    const camera = new THREE.PerspectiveCamera(70, width / height, 1, 50_000_000);

    const tilesRenderer = new TilesRenderer(GOOGLE_TILES_ROOT);
    tilesRenderer.errorTarget = tierConfig.errorTarget;
    tilesRenderer.maxDepth = tierConfig.maxDepth;
    tilesRenderer.lruCache.maxSize = tierConfig.lruMaxSize;
    tilesRenderer.parseQueue.maxJobs = tierConfig.parseQueueLimit;
    tilesRenderer.downloadQueue.maxJobs = tierConfig.downloadQueueLimit;
    tilesRenderer.registerPlugin(
      new GoogleCloudAuthPlugin({
        apiToken: clientEnv.googleMapsApiKey,
        autoRefreshToken: true,
      }),
    );
    tilesRenderer.setCamera(camera);
    tilesRenderer.setResolutionFromRenderer(camera, renderer);
    scene.add(tilesRenderer.group);

    const ambient = new THREE.HemisphereLight(0xeaf3ff, 0x080b04, 1.2);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 0.9);
    sun.position.set(0.8, 1, 0.2);
    scene.add(sun);

    // Approximate Linz/Pöstlingberg ground elevation above the WGS84 ellipsoid:
    // Pöstlingberg ~487 m above mean sea level + ~46 m EGM geoid offset for
    // this region ≈ 533 m. Used so the spawn sits above terrain instead of
    // below it; the per-frame ground raycast then clamps the camera to the
    // exact Google-Tiles surface as soon as tiles for the tile reach the LOD.
    const REGIONAL_GROUND_ALT_M = 533;
    const target = {
      lat: customer.coordinates[1],
      lng: customer.coordinates[0],
      alt: REGIONAL_GROUND_ALT_M,
    };
    const { position: spawnPos, lookAt } = spawnPoseSouthEast(target, 80, 32);
    camera.position.copy(spawnPos);
    camera.up.copy(latLngAltToECEF(target.lat, target.lng, 1).normalize());
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();

    let initialYaw = 0;
    let initialPitch = 0;
    {
      const surfaceNormal = latLngAltToECEF(target.lat, target.lng, 1).normalize();
      const camPos = spawnPos.clone();
      const forward = lookAt.clone().sub(camPos).normalize();
      const right = new THREE.Vector3().crossVectors(forward, surfaceNormal).normalize();
      const tangent = new THREE.Vector3().crossVectors(surfaceNormal, right).normalize();
      initialPitch = Math.asin(THREE.MathUtils.clamp(forward.dot(surfaceNormal), -1, 1));
      initialYaw = Math.atan2(forward.dot(right), forward.dot(tangent));
    }

    const controls = new FirstPersonControls({
      domElement: renderer.domElement,
      camera,
      getUp: () => {
        const p = camera.position;
        const out = ecefToLatLngAlt(p);
        return latLngAltToECEF(out.lat, out.lng, out.alt + 1).sub(p).normalize();
      },
    });
    controls.yaw = initialYaw;
    controls.pitch = initialPitch;
    controlsRef.current = controls;

    // Hotspots
    const hotspotMarkerMaterial = makeMarkerMaterial();
    const hotspotRuntimes: HotspotRuntime[] = hotspots.map((hotspot) => {
      const sprite = new THREE.Sprite(hotspotMarkerMaterial);
      const markerPos = latLngAltToECEF(hotspot.lat, hotspot.lng, hotspot.alt + 12);
      sprite.position.copy(markerPos);
      sprite.scale.set(16, 16, 16);
      scene.add(sprite);
      return {
        hotspot,
        marker: sprite,
        splat: null,
        splatLoaded: false,
        splatLoading: false,
        matrix: new THREE.Matrix4(),
        position: latLngAltToECEF(hotspot.lat, hotspot.lng, hotspot.alt),
      };
    });

    const ensureSplat = (runtime: HotspotRuntime) => {
      if (runtime.splat || runtime.splatLoading || !runtime.hotspot.splatUrl) return;
      runtime.splatLoading = true;
      try {
        const splat = new LumaSplatsThree({
          source: runtime.hotspot.splatUrl,
          loadingAnimationEnabled: false,
          enableThreeShaderIntegration: true,
        });
        splat.onLoad = () => {
          runtime.splatLoaded = true;
        };
        const matrix = WGS84.getEastNorthUpFrame(
          runtime.hotspot.lat * DEG2RAD,
          runtime.hotspot.lng * DEG2RAD,
          runtime.hotspot.alt + 1.6,
          new THREE.Matrix4(),
        );
        splat.applyMatrix4(matrix);
        const scaleMatrix = new THREE.Matrix4().makeScale(3, 3, 3);
        splat.applyMatrix4(scaleMatrix);
        scene.add(splat);
        runtime.splat = splat;
      } catch (error) {
        console.warn("[Welt] Splat init failed", runtime.hotspot.id, error);
        runtime.splatLoading = false;
      }
    };

    const removeSplat = (runtime: HotspotRuntime) => {
      if (!runtime.splat) return;
      try {
        runtime.splat.dispose();
      } catch {
        // ignore
      }
      scene.remove(runtime.splat);
      runtime.splat = null;
      runtime.splatLoaded = false;
      runtime.splatLoading = false;
    };

    const altitudeOverride: number | null = null;
    let groundY: number | null = null;
    let initialGroundClampDone = false;
    const velocity = new THREE.Vector3();

    // Telemetry
    let lastFrameTime = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let lastFps = 0;
    let tilesLoadedCount = 0;
    let lastAttribution = "";
    let activeHotspot: string | null = null;
    let flyAnim:
      | {
          fromPos: THREE.Vector3;
          toPos: THREE.Vector3;
          fromYaw: number;
          toYaw: number;
          fromPitch: number;
          toPitch: number;
          startMs: number;
        }
      | null = null;

    const onLoadModel = () => {
      tilesLoadedCount += 1;
      const attrs = tilesRenderer
        .getAttributions()
        .map((a) => (a.value ?? "").toString())
        .filter(Boolean);
      const unique = [...new Set(attrs)];
      lastAttribution = unique.join(" · ");
    };
    tilesRenderer.addEventListener("load-model", onLoadModel);
    const onTileChange = () => {
      const attrs = tilesRenderer
        .getAttributions()
        .map((a) => (a.value ?? "").toString())
        .filter(Boolean);
      const unique = [...new Set(attrs)];
      lastAttribution = unique.join(" · ");
    };
    tilesRenderer.addEventListener("tile-visibility-change", onTileChange);

    // Initial-load timeout fallback (so the UI never hangs).
    const tileTimeout = window.setTimeout(() => {
      if (tilesLoadedCount === 0) {
        console.warn("[Welt] Tiles haven't loaded within 12s, possibly an auth issue.");
      }
    }, TILE_SET_TIMEOUT_MS);

    const handle: WeltCanvasHandle = {
      flyToHotspot(hotspotId: string) {
        const runtime = hotspotRuntimes.find((r) => r.hotspot.id === hotspotId);
        if (!runtime) return;
        const targetPose = spawnPoseSouthEast(
          { lat: runtime.hotspot.lat, lng: runtime.hotspot.lng, alt: runtime.hotspot.alt },
          18,
          14,
        );
        const fromPos = camera.position.clone();
        flyAnim = {
          fromPos,
          toPos: targetPose.position.clone(),
          fromYaw: controls.yaw,
          toYaw: controls.yaw, // yaw recomputed when arriving
          fromPitch: controls.pitch,
          toPitch: 0,
          startMs: performance.now(),
        };
      },
      recenter() {
        camera.position.copy(spawnPos);
        camera.lookAt(lookAt);
        controls.yaw = initialYaw;
        controls.pitch = initialPitch;
      },
    };
    handleRef.current = handle;
    onReady?.(handle);

    // Debug-only inspection hook: only attached when ?debug=1 is in the URL.
    // Hidden-tab MCP browsers throttle requestAnimationFrame and drop synthetic
    // keyboard events, which prevents the e2e harness from exercising WASD.
    // This window-scoped hook lets the harness poke controls.input directly
    // (no dependency on the keydown listener) and confirm the motion pipeline
    // updates camera position.
    if (debug && typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__weltDebug = {
        controls,
        camera,
        tilesRenderer,
        get isPaused() {
          return pausedRef.current;
        },
        get position() {
          return ecefToLatLngAlt(camera.position);
        },
      };
    }

    let animId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      const deltaMs = now - lastTimestamp;
      lastTimestamp = now;
      const dt = Math.min(0.1, deltaMs / 1000);

      tilesRenderer.update();

      // Initial ground clamp — runs once after the first tiles arrive, even
      // while paused (e.g. during onboarding). Without this, opening the route
      // on a non-coastal customer leaves the camera at the spawn ellipsoid
      // altitude, which can be hundreds of metres below the real terrain.
      if (!initialGroundClampDone && tilesLoadedCount > 0) {
        const camPos = camera.position;
        const geo = ecefToLatLngAlt(camPos);
        const surfaceUpEnd = latLngAltToECEF(geo.lat, geo.lng, geo.alt + 1);
        const up = surfaceUpEnd.sub(camPos).normalize();
        const raycaster = new THREE.Raycaster(
          camPos.clone().add(up.clone().multiplyScalar(2000)),
          up.clone().multiplyScalar(-1),
          0,
          6000,
        );
        const hits = raycaster.intersectObject(tilesRenderer.group, true);
        if (hits.length > 0) {
          const surfacePos = hits[0].point.clone();
          camPos.copy(surfacePos.add(up.clone().multiplyScalar(1.7)));
          camera.up.copy(up);
          // Re-aim at the customer once we're at human eye-height.
          camera.lookAt(lookAt);
          initialGroundClampDone = true;
        }
      }

      if (!pausedRef.current) {
        if (flyAnim) {
          const progress = Math.min(1, (now - flyAnim.startMs) / FLY_DURATION_MS);
          const eased = easeInOutCubic(progress);
          camera.position.lerpVectors(flyAnim.fromPos, flyAnim.toPos, eased);
          if (progress >= 1) {
            const arrived = ecefToLatLngAlt(camera.position);
            const surfaceUp = latLngAltToECEF(arrived.lat, arrived.lng, 1)
              .sub(latLngAltToECEF(arrived.lat, arrived.lng, 0))
              .normalize();
            camera.up.copy(surfaceUp);
            flyAnim = null;
          }
        } else {
          const desired = computeDesiredVelocity(
            controls.input,
            DEFAULT_MOTION_CONFIG,
            { sprint: controls.input.sprint, fly: controls.flyMode },
          );
          // Build local frame at walker position
          const camPos = camera.position;
          const geo = ecefToLatLngAlt(camPos);
          const surfaceUpEnd = latLngAltToECEF(geo.lat, geo.lng, geo.alt + 1);
          const up = surfaceUpEnd.sub(camPos).normalize();
          // East/North at this lat/lng
          const east = new THREE.Vector3();
          const north = new THREE.Vector3();
          const upBasis = new THREE.Vector3();
          WGS84.getEastNorthUpAxes(geo.lat * DEG2RAD, geo.lng * DEG2RAD, east, north, upBasis);
          // Walker forward = north rotated around up by yaw
          const forward = north.clone().applyAxisAngle(up, controls.yaw).normalize();
          const right = new THREE.Vector3().crossVectors(forward, up).normalize();
          const targetVel = forward
            .clone()
            .multiplyScalar(desired.forward)
            .add(right.clone().multiplyScalar(desired.right))
            .add(up.clone().multiplyScalar(desired.up));

          velocity.x = integrateVelocity(
            velocity.x,
            targetVel.x,
            dt,
            DEFAULT_MOTION_CONFIG.friction,
          );
          velocity.y = integrateVelocity(
            velocity.y,
            targetVel.y,
            dt,
            DEFAULT_MOTION_CONFIG.friction,
          );
          velocity.z = integrateVelocity(
            velocity.z,
            targetVel.z,
            dt,
            DEFAULT_MOTION_CONFIG.friction,
          );
          camPos.addScaledVector(velocity, dt);
          camera.up.copy(up);

          // Ground clamp (walker mode only)
          if (!controls.flyMode) {
            const raycaster = new THREE.Raycaster(
              camPos.clone().add(up.clone().multiplyScalar(200)),
              up.clone().multiplyScalar(-1),
              0,
              5000,
            );
            const hits = raycaster.intersectObject(tilesRenderer.group, true);
            if (hits.length > 0) {
              const hit = hits[0];
              groundY = hit.point.distanceTo(latLngAltToECEF(geo.lat, geo.lng, 0));
              const desiredAlt = (altitudeOverride ?? 1.7) + (hit.distance > 0 ? 0 : 0);
              const surfacePos = hit.point.clone();
              const liftedTarget = surfacePos.add(up.clone().multiplyScalar(desiredAlt));
              camPos.copy(liftedTarget);
            }
          }

          // Update camera orientation
          const lookForward = forward
            .clone()
            .applyAxisAngle(right, controls.pitch)
            .normalize();
          const lookTarget = camPos.clone().add(lookForward);
          camera.lookAt(lookTarget);
        }
      }

      // Check hotspot proximity
      let enteredHotspot: string | null = null;
      for (const runtime of hotspotRuntimes) {
        const distance = camera.position.distanceTo(runtime.position);
        if (distance < 200) {
          ensureSplat(runtime);
        } else if (distance > 400) {
          removeSplat(runtime);
        }
        if (distance < HOTSPOT_ENTER_RADIUS_M) {
          enteredHotspot = runtime.hotspot.id;
        }
      }
      if (enteredHotspot !== activeHotspot) {
        activeHotspot = enteredHotspot;
        onHotspotEnter?.(activeHotspot);
      }

      // FPS
      fpsAccum += deltaMs;
      fpsFrames += 1;
      if (fpsAccum >= 500) {
        lastFps = Math.round((fpsFrames * 1000) / fpsAccum);
        fpsAccum = 0;
        fpsFrames = 0;
        const geo = ecefToLatLngAlt(camera.position);
        const headingDeg = (((controls.yaw * RAD2DEG) % 360) + 360) % 360;
        onTelemetry?.({
          fps: lastFps,
          altitude: groundY ?? 0,
          headingDeg,
          position: geo,
          attribution: lastAttribution,
          tilesLoaded: tilesLoadedCount,
        });
      }

      renderer.render(scene, camera);
      void lastFrameTime;
      lastFrameTime = now;
    };
    requestAnimationFrame(tick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      tilesRenderer.setResolutionFromRenderer(camera, renderer);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(tileTimeout);
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      tilesRenderer.removeEventListener("load-model", onLoadModel);
      tilesRenderer.removeEventListener("tile-visibility-change", onTileChange);
      controls.dispose();
      for (const runtime of hotspotRuntimes) {
        removeSplat(runtime);
        scene.remove(runtime.marker);
      }
      try {
        tilesRenderer.dispose();
      } catch {
        // ignore
      }
      renderer.dispose();
      try {
        container.removeChild(renderer.domElement);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id, hotspots.map((h) => h.id).join("|")]);

  // sync paused → ref
  useEffect(() => {
    // controls auto-releases lock on dispose; nothing to do for paused
    if (paused) controlsRef.current?.releaseLock();
  }, [paused]);

  return (
    <div className="absolute inset-0" id="welt-canvas">
      <div
        ref={containerRef}
        className="absolute inset-0 touch-none select-none"
        data-testid="welt-canvas"
        aria-label="Photorealistische 3D-Welt — mit WASD oder Joystick bewegen"
        role="region"
      />
      {isTouchDevice ? (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-col gap-2">
          <TouchJoystick onChange={(vec) => controlsRef.current?.setJoystick(vec)} />
        </div>
      ) : null}
      {debug ? (
        <div className="bg-background/80 absolute bottom-12 left-1/2 z-30 -translate-x-1/2 rounded-full border border-emerald-500/30 px-3 py-1 text-[10px] text-emerald-200">
          Debug-Modus aktiv
        </div>
      ) : null}
    </div>
  );
}

function subscribePointerMedia(onChange: () => void): () => void {
  const match = window.matchMedia("(pointer:coarse)");
  match.addEventListener("change", onChange);
  return () => match.removeEventListener("change", onChange);
}

function getPointerMediaSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer:coarse)").matches;
}

function makeMarkerMaterial(): THREE.SpriteMaterial {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grd.addColorStop(0, "rgba(255,255,255,0.95)");
    grd.addColorStop(0.45, "rgba(74, 222, 128, 0.85)");
    grd.addColorStop(1, "rgba(20, 83, 45, 0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "rgba(20, 83, 45, 0.9)";
    ctx.arc(64, 64, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.SpriteMaterial({
    map: texture,
    depthWrite: false,
    transparent: true,
  });
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
