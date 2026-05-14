"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, BookOpen, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customers";

type Props = {
  open: boolean;
  customer: Customer;
  audioEnabled: boolean;
  onResume: () => void;
  onShowTutorial: () => void;
  onToggleAudio: () => void;
};

export function EscapeOverlay({
  open,
  customer,
  audioEnabled,
  onResume,
  onShowTutorial,
  onToggleAudio,
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="escape"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="border-border/60 bg-background relative flex w-full max-w-sm flex-col gap-3 rounded-3xl border p-6"
          >
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">
                Pausenmenü
              </span>
              <h2 className="text-xl font-semibold tracking-tight">{customer.name}</h2>
              <p className="text-muted-foreground text-xs">
                Die Welt ist pausiert. ESC drücken oder „Fortsetzen&ldquo; klicken.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={onResume} className="justify-start">
                <Play className="mr-1.5 h-4 w-4" />
                Fortsetzen
              </Button>
              <Button variant="outline" onClick={onShowTutorial} className="justify-start">
                <BookOpen className="mr-1.5 h-4 w-4" />
                Tutorial wiederholen
              </Button>
              <Button variant="outline" onClick={onToggleAudio} className="justify-start">
                {audioEnabled ? (
                  <>
                    <VolumeX className="mr-1.5 h-4 w-4" />
                    Audio stummschalten
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-1.5 h-4 w-4" />
                    Audio aktivieren
                  </>
                )}
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/?customer=${customer.id}`}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Zur Karte zurück
                </Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
