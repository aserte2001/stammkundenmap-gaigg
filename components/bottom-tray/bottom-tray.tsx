"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useReducedMotion } from "motion/react";
import { ChevronUp, GripHorizontal } from "lucide-react";
import { customers } from "@/lib/customers";
import { filterCustomers, filterStats, hasActiveFilters, useAppStore } from "@/lib/store";
import { CustomerList } from "@/components/sidebar/customer-list";
import { FilterBar } from "@/components/sidebar/filter-bar";
import { SearchInput } from "@/components/sidebar/search-input";

type SnapLevel = "collapsed" | "peek" | "full";

const SNAP_HEIGHTS: Record<SnapLevel, number> = {
  collapsed: 72,
  peek: 380,
  full: 680,
};

function TrayContent({ level }: { level: SnapLevel }) {
  const filters = useAppStore((s) => s.filters);
  const viewportOnly = useAppStore((s) => s.viewportOnlyFilter);
  const visibleIds = useAppStore((s) => s.visibleIdsInViewport);

  const filtered = useMemo(
    () => filterCustomers(customers, filters, { viewportOnly, visibleIds }),
    [filters, viewportOnly, visibleIds],
  );
  const stats = useMemo(() => filterStats(filtered), [filtered]);
  const filteredFlag = hasActiveFilters(filters) || viewportOnly;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-1 pb-2">
        <span className="text-foreground text-sm font-semibold">
          {stats.count} {filteredFlag ? "gefiltert" : "Stammkunden"}
        </span>
        {stats.vipCount > 0 ? (
          <span className="bg-vip/15 text-vip rounded-full px-2 py-0.5 text-[10px] font-medium">
            {stats.vipCount} VIP
          </span>
        ) : null}
      </div>
      {level !== "collapsed" ? (
        <>
          <div className="border-border border-b px-4 pb-3">
            <SearchInput />
          </div>
          {level === "full" ? (
            <div className="border-border border-b">
              <FilterBar />
            </div>
          ) : null}
          <div className="min-h-0 flex-1">
            <CustomerList />
          </div>
        </>
      ) : null}
    </div>
  );
}

export function BottomTray() {
  const [level, setLevel] = useState<SnapLevel>("peek");
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const y = useMotionValue(0);

  const height = SNAP_HEIGHTS[level];

  const snapTo = (newLevel: SnapLevel) => {
    setLevel(newLevel);
    y.set(0);
  };

  const handleDragEnd = (_: unknown, info: { velocity: { y: number }; offset: { y: number } }) => {
    const swipeUp = info.velocity.y < -200 || info.offset.y < -60;
    const swipeDown = info.velocity.y > 200 || info.offset.y > 60;

    if (swipeUp) {
      if (level === "collapsed") snapTo("peek");
      else if (level === "peek") snapTo("full");
    } else if (swipeDown) {
      if (level === "full") snapTo("peek");
      else if (level === "peek") snapTo("collapsed");
    } else {
      y.set(0);
    }
  };

  const borderRadius = useTransform(y, [-100, 0], [28, 24]);

  return (
    <motion.div
      ref={containerRef}
      className="bg-background/85 border-border pointer-events-auto fixed bottom-0 left-0 z-30 flex w-full flex-col overflow-hidden border-t shadow-2xl backdrop-blur-2xl md:left-4 md:w-[400px]"
      style={{
        height,
        borderTopLeftRadius: borderRadius,
        borderTopRightRadius: borderRadius,
        y,
      }}
      animate={{ height }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 400, damping: 35 }
      }
      aria-label="Kundenliste"
    >
      <motion.div
        className="flex cursor-grab touch-none flex-col items-center gap-1 pb-1 pt-3 active:cursor-grabbing"
        drag="y"
        dragConstraints={{ top: -80, bottom: 80 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ y }}
        onClick={() => {
          if (level === "collapsed") snapTo("peek");
          else if (level === "peek") snapTo("full");
          else snapTo("peek");
        }}
      >
        <div className="bg-muted-foreground/40 h-1 w-10 rounded-full" />
        <ChevronUp
          className={`text-muted-foreground h-4 w-4 transition-transform duration-300 ${
            level === "full" ? "rotate-180" : ""
          }`}
        />
      </motion.div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <TrayContent level={level} />
      </div>
    </motion.div>
  );
}
