"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
  /** Idle seconds after which the camera starts a slow auto-orbit. */
  idleAutoRotateSeconds?: number;
};

export function MarbleSplatViewer({ splatUrls, label, idleAutoRotateSeconds = 5 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  // Initialised lazily inside the effect (Date.now is impure during render).
  const lastInteractionRef = useRef<number>(0);
  const [tier, setTier] = useState<SplatTier>(() =>
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
      ? "100k"
      : "500k",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const activeUrl = pickUrl(splatUrls, tier);

  useEffect(() => {
    if (!containerRef.current || !activeUrl) return;
    const container = containerRef.current;
    let disposed = false;
    let raf = 0;
    lastInteractionRef.current = Date.now();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.05,
      200,
    );
    camera.position.set(0, 1.6, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 50;
    controls.target.set(0, 1, 0);

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
        // Re-target camera roughly at the splat centroid.
        try {
          const box = new THREE.Box3().setFromObject(splatMesh);
          if (box.isEmpty()) return;
          const center = new THREE.Vector3();
          box.getCenter(center);
          const size = new THREE.Vector3();
          box.getSize(size);
          const radius = size.length() / 2;
          controls.target.copy(center);
          camera.position.copy(center).add(new THREE.Vector3(0, 0, radius * 1.6));
          camera.near = Math.max(0.05, radius * 0.005);
          camera.far = radius * 200;
          camera.updateProjectionMatrix();
        } catch (err) {
          console.warn("centring splat failed", err);
        }
      },
    });
    scene.add(splatMesh);

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

    const onInteract = () => {
      lastInteractionRef.current = Date.now();
    };
    renderer.domElement.addEventListener("pointerdown", onInteract);
    renderer.domElement.addEventListener("wheel", onInteract);

    const animate = () => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const idleMs = Date.now() - lastInteractionRef.current;
      if (idleMs > idleAutoRotateSeconds * 1000) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
      } else {
        controls.autoRotate = false;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    cleanupRef.current = () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onInteract);
      renderer.domElement.removeEventListener("wheel", onInteract);
      controls.dispose();
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
  }, [activeUrl, idleAutoRotateSeconds]);

  if (!activeUrl) {
    return (
      <div className="bg-card text-muted-foreground flex h-full w-full items-center justify-center p-6 text-sm">
        Keine Splat-URL für die ausgewählte Qualität verfügbar.
      </div>
    );
  }

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
      {error && (
        <div className="bg-background/90 text-destructive absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
          {error}
        </div>
      )}
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

// Fallback for environments where Loader2 is removed by tree-shaking.
void Loader2;
