"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { SEASON_CONFIG, type Season } from "@/lib/season";
import { useAppStore } from "@/lib/store";

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  phase: number;
};

const MAX_PARTICLES_DESKTOP = 25;
const MAX_PARTICLES_MOBILE = 12;

function createParticle(width: number, height: number, type: string): Particle {
  const base: Particle = {
    x: Math.random() * width,
    y: -20 - Math.random() * 100,
    size: 4 + Math.random() * 8,
    speed: 0.3 + Math.random() * 0.6,
    drift: (Math.random() - 0.5) * 0.8,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    opacity: 0.2 + Math.random() * 0.35,
    phase: Math.random() * Math.PI * 2,
  };

  if (type === "snow") {
    base.size = 2 + Math.random() * 5;
    base.speed = 0.2 + Math.random() * 0.4;
    base.drift = (Math.random() - 0.5) * 0.3;
    base.opacity = 0.3 + Math.random() * 0.5;
  } else if (type === "leaves") {
    base.size = 6 + Math.random() * 10;
    base.speed = 0.5 + Math.random() * 0.8;
    base.drift = (Math.random() - 0.5) * 1.2;
    base.rotationSpeed = (Math.random() - 0.5) * 0.04;
  } else if (type === "sunflare") {
    base.x = Math.random() * width;
    base.y = Math.random() * height;
    base.size = 2 + Math.random() * 4;
    base.speed = 0;
    base.opacity = 0.08 + Math.random() * 0.15;
  }

  return base;
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  type: string,
  time: number,
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.opacity;

  if (type === "blossom") {
    ctx.fillStyle = `oklch(0.82 0.14 350)`;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -p.size * 0.4, p.size * 0.3, p.size * 0.5, (i * Math.PI * 2) / 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `oklch(0.90 0.10 80)`;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "snow") {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    grad.addColorStop(0.5, "rgba(220, 230, 255, 0.5)");
    grad.addColorStop(1, "rgba(200, 215, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "leaves") {
    const hue = 40 + Math.sin(p.phase) * 20;
    ctx.fillStyle = `oklch(0.65 0.16 ${hue})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.5, p.size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `oklch(0.50 0.12 ${hue})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-p.size * 0.4, 0);
    ctx.lineTo(p.size * 0.4, 0);
    ctx.stroke();
  } else if (type === "sunflare") {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.001 + p.phase);
    ctx.globalAlpha = p.opacity * pulse;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * (1 + pulse * 0.5));
    grad.addColorStop(0, "rgba(255, 240, 180, 0.8)");
    grad.addColorStop(0.5, "rgba(255, 220, 120, 0.3)");
    grad.addColorStop(1, "rgba(255, 200, 80, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function updateParticle(
  p: Particle,
  type: string,
  width: number,
  height: number,
  time: number,
): boolean {
  if (type === "sunflare") {
    const pulse = Math.sin(time * 0.0005 + p.phase);
    if (pulse < -0.8) {
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.phase = Math.random() * Math.PI * 2;
    }
    return true;
  }

  p.y += p.speed;
  p.x += p.drift + Math.sin(time * 0.001 + p.phase) * 0.3;
  p.rotation += p.rotationSpeed;

  return p.y < height + 40;
}

export function SeasonParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const season = useAppStore((s) => s.season);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const particles: Particle[] = [];
    const type = SEASON_CONFIG[season].particleType;

    let maxParticles = window.innerWidth < 768 ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;
    const baseInterval = type === "sunflare" ? 200 : 400;
    let spawnInterval = window.innerWidth < 768 ? baseInterval * 1.5 : baseInterval;
    let lastSpawn = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      maxParticles = window.innerWidth < 768 ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;
      spawnInterval = window.innerWidth < 768 ? baseInterval * 1.5 : baseInterval;
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (time: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      if (time - lastSpawn > spawnInterval && particles.length < maxParticles) {
        particles.push(createParticle(w, h, type));
        lastSpawn = time;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const alive = updateParticle(particles[i], type, w, h, time);
        if (!alive) {
          particles.splice(i, 1);
        } else {
          drawParticle(ctx, particles[i], type, time);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [season, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10"
      aria-hidden="true"
    />
  );
}
