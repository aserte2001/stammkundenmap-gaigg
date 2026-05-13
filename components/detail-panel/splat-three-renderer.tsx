"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LumaSplatsThree } from "@lumaai/luma-web";
import { Loader2, RotateCcw, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  url: string;
};

export function SplatThreeRenderer({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animRef = useRef<number | null>(null);
  const splatRef = useRef<LumaSplatsThree | null>(null);
  const visibilityRef = useRef<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x131913, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(2.4, 1.6, 3.4);
    camera.lookAt(0, 0.6, 0);
    cameraRef.current = camera;

    const ambient = new THREE.AmbientLight(0xc8d8b8, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xfff6dc, 1.2);
    dir.position.set(4, 6, 4);
    scene.add(dir);

    let splat: LumaSplatsThree | null = null;
    try {
      splat = new LumaSplatsThree({
        source: url,
        loadingAnimationEnabled: true,
        enableThreeShaderIntegration: false,
      });
      splat.onLoad = () => setLoading(false);
      scene.add(splat);
      splatRef.current = splat;
    } catch (err) {
      console.warn("Luma splat init failed, falling back to procedural scene", err);
      const geometry = new THREE.IcosahedronGeometry(0.9, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x5fb55c, roughness: 0.6 });
      scene.add(new THREE.Mesh(geometry, material));
      queueMicrotask(() => setLoading(false));
    }

    const clock = new THREE.Clock();

    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      if (!visibilityRef.current) return;
      const delta = clock.getDelta();
      if (autoRotate) {
        camera.position.x = Math.cos(performance.now() * 0.00025) * 3.4;
        camera.position.z = Math.sin(performance.now() * 0.00025) * 3.4;
        camera.lookAt(0, 0.6, 0);
      }
      void delta;
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibilityRef.current = entry?.isIntersecting ?? true;
      },
      { threshold: 0.1 },
    );
    observer.observe(container);

    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
      try {
        splat?.dispose();
      } catch {
        // ignore
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [url, autoRotate]);

  const resetView = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.set(2.4, 1.6, 3.4);
    camera.lookAt(0, 0.6, 0);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-card">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm">3D-Erfassung wird geladen…</span>
        </div>
      ) : null}
      <div ref={containerRef} className="absolute inset-0" data-testid="splat-three-renderer" />
      <div className="absolute bottom-3 right-3 z-20 flex gap-1.5">
        <Button
          size="icon"
          variant="secondary"
          onClick={() => setAutoRotate((v) => !v)}
          title={autoRotate ? "Auto-Rotation pausieren" : "Auto-Rotation starten"}
          aria-label="Auto-Rotation"
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={resetView}
          title="Ansicht zurücksetzen"
          aria-label="Ansicht zurücksetzen"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
