"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { Loader2, MousePointerClick, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { FirstPersonControls } from "./welt-controls/first-person-controls";
import { TouchJoystick } from "./touch-joystick";

export type SplatTier = "100k" | "500k" | "full";

type SplatUrls = {
  splatUrl100k: string | null;
  splatUrl500k: string | null;
  splatUrl: string | null;
};

type Props = {
  splatUrls: SplatUrls;
  /** Optional initial label shown on the loading overlay. */
  label?: string;
};

// World Labs Marble exports SPZ files in the OpenCV coordinate system
// (+X right, +Y down, +Z forward). Three.js / WebGL is OpenGL-ish
// (+X right, +Y up, -Z forward). The conversion is a 180° rotation around
// the X axis: Y -> -Y, Z -> -Z. Without this every Marble world renders
// upside down. Source: docs.worldlabs.ai/marble/export/specs
const OPENCV_TO_OPENGL_X_ROT = Math.PI;

const EYE_HEIGHT = 1.6;       // metres above world origin for the spawn pose
const WALK_SPEED = 1.5;       // m/s base — sprint multiplies by 2.4
const FLY_SPEED = 1.5;        // m/s base when flyMode is enabled. Marble worlds
                              // are typically 3–5 m wide rooms, so 1.5 m/s is
                              // about one body-length per second — comfortable
                              // to look around without flying through walls.
const SPRINT_MULTIPLIER = 2.4;

export function MarbleSplatViewer({ splatUrls, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<FirstPersonControls | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [tier, setTier] = useState<SplatTier>(() =>
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
      ? "100k"
      : "500k",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  // Touch detection via lazy initializer — avoids `react-hooks/set-state-
  // in-effect` and the SSR hydration mismatch we'd get from reading
  // `matchMedia` during render on the server (always false there).
  const [isTouch] = useState<boolean>(() =>
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true,
  );

  const activeUrl = pickUrl(splatUrls, tier);

  useEffect(() => {
    if (!containerRef.current || !activeUrl) return;
    const container = containerRef.current;
    let disposed = false;
    let raf = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.05,
      500,
    );
    // Initial spawn before splat bounds are known: at origin, eye height.
    camera.position.set(0, EYE_HEIGHT, 0);

    const sparkRenderer = new SparkRenderer({ renderer });
    scene.add(sparkRenderer);

    setProgress(0);
    setError(null);

    const splatMesh = new SplatMesh({
      url: activeUrl,
      onProgress: (event: ProgressEvent) => {
        if (disposed) return;
        if (event.lengthComputable && event.total > 0) {
          setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      },
      onLoad: () => {
        if (disposed) return;
        setProgress(100);
        // Marble worlds are reconstructed with the photographer's standpoint
        // at the world origin. After the OpenCV→OpenGL X-rotation the origin
        // still maps to itself, so spawning at (0, 0, 0) puts the eye exactly
        // where the camera was during capture — inside the dense splat cloud,
        // looking toward -Z (Three.js default forward). We only adjust the
        // near/far clip planes from the bounds, never the position.
        try {
          const box = new THREE.Box3().setFromObject(splatMesh);
          if (!box.isEmpty()) {
            const size = new THREE.Vector3();
            box.getSize(size);
            camera.near = Math.max(0.05, size.length() * 0.0005);
            camera.far = Math.max(500, size.length() * 4);
            camera.updateProjectionMatrix();
          }
        } catch (err) {
          console.warn("computing splat bounds failed", err);
        }
        camera.position.set(0, 0, 0);
      },
    });
    // Apply OpenCV→OpenGL fix before the mesh is added. The bounds
    // computed in onLoad will reflect this rotation automatically.
    splatMesh.rotation.x = OPENCV_TO_OPENGL_X_ROT;
    scene.add(splatMesh);

    // First-person controls. For Marble worlds the up-vector is the
    // standard Y axis (after rotation), so getUp() returns a constant.
    const worldUp = new THREE.Vector3(0, 1, 0);
    const controls = new FirstPersonControls({
      domElement: renderer.domElement,
      camera,
      getUp: () => worldUp,
      onLockChange: (next) => setLocked(next),
    });
    // Fly-mode by default: Marble worlds rarely contain a watertight
    // floor mesh that the avatar could rest on, so locking Y to a ground
    // raycast would leave the camera dangling in the air at random
    // heights. Letting the user fly freely (Space / Q-E for vertical)
    // is the right default for a fly-through demo.
    controls.flyMode = true;
    controlsRef.current = controls;

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    resizeObserver?.observe(container);

    let lastFrameMs = performance.now();

    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.066, (now - lastFrameMs) / 1000);
      lastFrameMs = now;

      // Apply yaw / pitch from controls (computed in local frame).
      const up = worldUp;
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(up, controls.yaw);
      // The reference "north" we yaw around: -Z rotated to be perpendicular to up.
      const referenceForward = new THREE.Vector3(0, 0, -1);
      const forward = referenceForward.clone().applyQuaternion(yawQuat).normalize();
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();
      // Pitch tilts the forward vector around the right axis.
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, controls.pitch);
      const lookDir = forward.clone().applyQuaternion(pitchQuat).normalize();

      // Orient the camera so its default forward (-Z local) points along
      // lookDir. Three.js' Matrix4.lookAt internally sets z = eye - target,
      // and the camera looks down -Z, so feeding the *positive* lookDir as
      // target makes the camera look in +lookDir — the direction the user
      // expects. The earlier multiplyScalar(-1) reversed every input axis.
      const camQuat = new THREE.Quaternion();
      const m = new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0),
        lookDir,
        up,
      );
      camQuat.setFromRotationMatrix(m);
      camera.quaternion.copy(camQuat);

      // Velocity integration.
      const speed =
        (controls.flyMode ? FLY_SPEED : WALK_SPEED) *
        (controls.input.sprint ? SPRINT_MULTIPLIER : 1);
      const move = new THREE.Vector3();
      move.addScaledVector(forward, controls.input.forward * speed * dt);
      move.addScaledVector(right, controls.input.strafe * speed * dt);
      if (controls.flyMode) {
        move.addScaledVector(up, controls.input.vertical * speed * dt);
      }
      camera.position.add(move);

      renderer.render(scene, camera);
    };
    tick();

    cleanupRef.current = () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      controls.dispose();
      controlsRef.current = null;
      try {
        scene.remove(splatMesh);
        (splatMesh as unknown as { dispose?: () => void }).dispose?.();
      } catch {
        /* noop */
      }
      try {
        scene.remove(sparkRenderer);
        (sparkRenderer as unknown as { dispose?: () => void }).dispose?.();
      } catch {
        /* noop */
      }
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [activeUrl]);

  const handleJoystick = (vec: { x: number; y: number }) => {
    controlsRef.current?.setJoystick(vec);
  };

  if (!activeUrl) {
    return (
      <div className="bg-card text-muted-foreground flex h-full w-full items-center justify-center p-6 text-sm">
        Keine Splat-URL für die ausgewählte Qualität verfügbar.
      </div>
    );
  }

  const showClickToStart = !isTouch && !locked && progress >= 100 && !error;

  return (
    <div className="bg-background relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" data-testid="marble-splat-canvas" />

      {progress < 100 && !error && (
        <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur">
          <Sparkles className="text-primary h-10 w-10" aria-hidden />
          <div className="text-sm font-medium">Lade {label ?? "Welt"}…</div>
          <div className="bg-muted h-2 w-48 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-muted-foreground text-xs">{progress}%</div>
        </div>
      )}

      {showClickToStart && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-card/85 text-foreground border-border flex flex-col items-center gap-2 rounded-lg border px-5 py-4 text-center text-sm backdrop-blur">
            <MousePointerClick className="text-primary h-6 w-6" aria-hidden />
            <p className="font-medium">In die Welt klicken zum Begehen</p>
            <p className="text-muted-foreground text-xs">
              W A S D bewegen · Maus schauen · Shift sprintet · Q / E hoch / runter · ESC verlässt
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-background/90 text-destructive absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
          {error}
        </div>
      )}

      {/* Tier picker — bottom right. */}
      <div className="bg-card/80 pointer-events-auto absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full p-1 backdrop-blur">
        <TierButton current={tier} value="100k" onSelect={setTier}>
          Mobile
        </TierButton>
        <TierButton current={tier} value="500k" onSelect={setTier}>
          Standard
        </TierButton>
        <TierButton current={tier} value="full" onSelect={setTier}>
          HQ
        </TierButton>
      </div>

      {/* Touch joystick for mobile. */}
      {isTouch && progress >= 100 && !error && (
        <div className="pointer-events-auto absolute bottom-6 left-6">
          <TouchJoystick onChange={handleJoystick} />
        </div>
      )}
    </div>
  );
}

function TierButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: SplatTier;
  value: SplatTier;
  onSelect: (t: SplatTier) => void;
  children: React.ReactNode;
}) {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={isActive}
    >
      {children}
    </button>
  );
}

function pickUrl(urls: SplatUrls, tier: SplatTier): string | null {
  if (tier === "100k") return urls.splatUrl100k ?? urls.splatUrl500k ?? urls.splatUrl;
  if (tier === "500k") return urls.splatUrl500k ?? urls.splatUrl ?? urls.splatUrl100k;
  return urls.splatUrl ?? urls.splatUrl500k ?? urls.splatUrl100k;
}

// Tree-shaking guard for icons that may be conditionally used.
void Loader2;
