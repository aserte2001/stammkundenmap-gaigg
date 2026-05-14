"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Keyboard, MousePointer2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = {
  icon: typeof Keyboard;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: Keyboard,
    title: "Bewegen",
    body: "W / A / S / D oder die Pfeiltasten bewegen Sie. Shift sprintet. Auf dem Smartphone: linker Joystick.",
  },
  {
    icon: MousePointer2,
    title: "Schauen",
    body: "Klick aufs Canvas → Maus zum Umschauen. Auf dem Smartphone: rechte Bildschirmseite ziehen.",
  },
  {
    icon: Sparkles,
    title: "Hotspots",
    body: "Grüne Marker zeigen besondere Orte. Klick auf den Punkt am Boden bringt Sie direkt dorthin.",
  },
];

type Props = {
  open: boolean;
  onDismiss: (remember: boolean) => void;
};

export function OnboardingOverlay({ open, onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const Icon = current.icon;

  const isLast = step === total - 1;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welt-onboarding-title"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="border-border/60 bg-background relative flex w-full max-w-md flex-col gap-5 overflow-hidden rounded-3xl border p-6 shadow-2xl"
          >
            <div className="bg-primary/15 text-primary inline-flex h-12 w-12 items-center justify-center rounded-2xl">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">
                Schritt {step + 1} von {total}
              </span>
              <h2 id="welt-onboarding-title" className="text-xl font-semibold tracking-tight">
                {current.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{current.body}</p>
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => onDismiss(true)}
                className="text-muted-foreground text-xs"
              >
                Niemals mehr zeigen
              </Button>
              <div className="flex items-center gap-2">
                {step > 0 ? (
                  <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                    Zurück
                  </Button>
                ) : null}
                {isLast ? (
                  <Button size="sm" onClick={() => onDismiss(true)}>
                    Verstanden, los geht&apos;s
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                    Weiter
                  </Button>
                )}
              </div>
            </div>
            <div className="bg-muted/40 absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
              <motion.div
                className="bg-primary h-full"
                initial={false}
                animate={{ width: `${((step + 1) / total) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
