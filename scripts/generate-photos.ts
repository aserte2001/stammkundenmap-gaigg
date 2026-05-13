/**
 * Generates 25 deterministic SVG "garden photos" for each customer.
 * Run once during build: `npm run fetch:photos`.
 *
 * Output: public/photos/<customer-id>.svg (1200x800 viewBox).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { customers } from "../lib/customers";

const OUT_DIR = join(process.cwd(), "public", "photos");

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

const PALETTES = [
  ["#0e1f12", "#1f4127", "#3a7d3a", "#7fbf5c", "#dcefb1"],
  ["#0c1b1f", "#143b40", "#266b62", "#5fb5a0", "#cdeacb"],
  ["#1b1208", "#3a2415", "#6f4520", "#b6884c", "#e9d49a"],
  ["#0d1c0d", "#22552b", "#4b9a4a", "#9bd07a", "#f3eec0"],
  ["#0a1f2a", "#1d4c5e", "#3e8a8f", "#86c8b8", "#e6f5d6"],
];

type GardenScene = {
  palette: readonly string[];
  trees: number;
  bushShapes: number;
  hasPond: boolean;
  pathStyle: "stone" | "wood" | "gravel";
  skyHue: number;
};

function buildScene(id: string): GardenScene {
  const rnd = rng(hash(id));
  return {
    palette: PALETTES[Math.floor(rnd() * PALETTES.length)],
    trees: 2 + Math.floor(rnd() * 4),
    bushShapes: 4 + Math.floor(rnd() * 6),
    hasPond: rnd() > 0.55,
    pathStyle: (["stone", "wood", "gravel"] as const)[Math.floor(rnd() * 3)],
    skyHue: 195 + Math.floor(rnd() * 40),
  };
}

function svgFor(id: string, name: string): string {
  const scene = buildScene(id);
  const rnd = rng(hash(`${id}-pos`));
  const [bg, deep, mid, fresh, highlight] = scene.palette;

  const trees: string[] = [];
  for (let i = 0; i < scene.trees; i++) {
    const x = 80 + rnd() * 1040;
    const y = 460 + rnd() * 220;
    const r = 70 + rnd() * 60;
    const trunkH = 90 + rnd() * 60;
    trees.push(`
      <g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">
        <rect x="-8" y="0" width="16" height="${trunkH.toFixed(0)}" rx="4" fill="#3a2410"/>
        <ellipse cx="0" cy="-${(r * 0.4).toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.85).toFixed(0)}" fill="${deep}" opacity="0.92"/>
        <ellipse cx="${(rnd() * 30 - 15).toFixed(0)}" cy="-${(r * 0.6).toFixed(0)}" rx="${(r * 0.7).toFixed(0)}" ry="${(r * 0.6).toFixed(0)}" fill="${mid}" opacity="0.85"/>
        <ellipse cx="${(rnd() * 30 - 15).toFixed(0)}" cy="-${(r * 0.8).toFixed(0)}" rx="${(r * 0.45).toFixed(0)}" ry="${(r * 0.4).toFixed(0)}" fill="${fresh}" opacity="0.75"/>
      </g>`);
  }

  const bushes: string[] = [];
  for (let i = 0; i < scene.bushShapes; i++) {
    const x = 60 + rnd() * 1080;
    const y = 540 + rnd() * 220;
    const r = 28 + rnd() * 48;
    bushes.push(`
      <ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.65).toFixed(0)}" fill="${mid}" opacity="0.85"/>
      <ellipse cx="${(x + rnd() * 12).toFixed(0)}" cy="${(y - r * 0.3).toFixed(0)}" rx="${(r * 0.65).toFixed(0)}" ry="${(r * 0.45).toFixed(0)}" fill="${fresh}" opacity="0.8"/>`);
  }

  const pond = scene.hasPond
    ? `<ellipse cx="${(720 + rnd() * 140).toFixed(0)}" cy="${(620 + rnd() * 60).toFixed(0)}" rx="${(140 + rnd() * 80).toFixed(0)}" ry="${(34 + rnd() * 24).toFixed(0)}" fill="${scene.skyHue > 215 ? "#3a8fb0" : "#266c8a"}" opacity="0.85"/>`
    : "";

  const pathFill =
    scene.pathStyle === "stone"
      ? "#7d7b6b"
      : scene.pathStyle === "wood"
        ? "#7a4f24"
        : "#bcae8a";

  const path = `
    <path d="M0 750 Q 300 690 600 740 T 1200 720 L 1200 800 L 0 800 Z" fill="${pathFill}" opacity="0.55"/>
    <path d="M0 760 Q 300 700 600 750 T 1200 730" stroke="${highlight}" stroke-width="2" fill="none" opacity="0.4"/>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="Garten von ${name}">
  <defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="hsl(${scene.skyHue} 38% 18%)"/>
      <stop offset="60%" stop-color="hsl(${scene.skyHue - 15} 30% 30%)"/>
      <stop offset="100%" stop-color="${bg}"/>
    </linearGradient>
    <radialGradient id="sun-${id}" cx="78%" cy="22%" r="40%">
      <stop offset="0%" stop-color="rgba(255, 235, 180, 0.55)"/>
      <stop offset="60%" stop-color="rgba(255, 235, 180, 0)"/>
    </radialGradient>
    <linearGradient id="ground-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${deep}"/>
      <stop offset="100%" stop-color="${bg}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky-${id})"/>
  <rect width="1200" height="800" fill="url(#sun-${id})"/>
  <path d="M0 460 Q 300 380 600 440 T 1200 420 L 1200 800 L 0 800 Z" fill="url(#ground-${id})"/>
  ${pond}
  ${trees.join("\n")}
  ${bushes.join("\n")}
  ${path}
  <rect x="40" y="40" width="320" height="64" rx="12" fill="rgba(8, 14, 8, 0.55)"/>
  <text x="60" y="80" font-family="Geist, Inter, sans-serif" font-size="22" font-weight="600" fill="${highlight}">${name}</text>
</svg>
`;
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const customer of customers) {
    const svg = svgFor(customer.id, customer.name);
    const path = join(OUT_DIR, `${customer.id}.svg`);
    writeFileSync(path, svg, "utf8");
  }
  console.log(`Generated ${customers.length} customer photos in ${OUT_DIR}`);
}

main();
