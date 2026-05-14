"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onChange: (vec: { x: number; y: number }) => void;
};

const RADIUS = 64;
const KNOB = 28;

export function TouchJoystick({ onChange }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const compute = useCallback((clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const magnitude = Math.hypot(dx, dy);
    const clamp = Math.min(magnitude, RADIUS);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * clamp;
    const y = Math.sin(angle) * clamp;
    setOffset({ x, y });
    onChange({ x: x / RADIUS, y: y / RADIUS });
  }, [onChange]);

  useEffect(() => {
    if (!active) return;
    const handler = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      compute(touch.clientX, touch.clientY);
    };
    const finish = () => {
      setActive(false);
      setOffset({ x: 0, y: 0 });
      onChange({ x: 0, y: 0 });
    };
    window.addEventListener("touchmove", handler, { passive: true });
    window.addEventListener("touchend", finish);
    window.addEventListener("touchcancel", finish);
    return () => {
      window.removeEventListener("touchmove", handler);
      window.removeEventListener("touchend", finish);
      window.removeEventListener("touchcancel", finish);
    };
  }, [active, compute, onChange]);

  return (
    <div
      ref={baseRef}
      onTouchStart={(event) => {
        event.preventDefault();
        setActive(true);
        const touch = event.touches[0];
        if (touch) compute(touch.clientX, touch.clientY);
      }}
      role="presentation"
      aria-hidden="true"
      className="border-border/40 bg-background/70 pointer-events-auto relative h-32 w-32 rounded-full border backdrop-blur-md"
      style={{ touchAction: "none" }}
    >
      <span className="text-muted-foreground absolute inset-x-0 top-1.5 text-center text-[10px]">
        Bewegen
      </span>
      <div
        className="border-primary/40 bg-primary/30 absolute h-14 w-14 rounded-full border"
        style={{
          left: `calc(50% - ${KNOB / 2}px)`,
          top: `calc(50% - ${KNOB / 2}px)`,
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
      />
    </div>
  );
}
