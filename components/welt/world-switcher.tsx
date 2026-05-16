"use client";

import { cn } from "@/lib/utils";

type World = {
  id: string;
  label: string;
};

type Props = {
  worlds: ReadonlyArray<World>;
  activeId: string;
  onSelect: (id: string) => void;
};

export function WorldSwitcher({ worlds, activeId, onSelect }: Props) {
  if (worlds.length <= 1) return null;
  return (
    <div className="bg-card/85 pointer-events-auto inline-flex max-w-[90vw] items-center gap-1 overflow-x-auto rounded-full border border-border p-1 backdrop-blur">
      {worlds.map((world) => {
        const isActive = world.id === activeId;
        return (
          <button
            key={world.id}
            type="button"
            onClick={() => onSelect(world.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={isActive}
          >
            {world.label}
          </button>
        );
      })}
    </div>
  );
}
