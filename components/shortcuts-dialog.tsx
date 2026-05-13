"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";

type Shortcut = {
  keys: string[];
  description: string;
};

const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], description: "Schnellsuche / Befehle öffnen" },
  { keys: ["⌘", "/"], description: "Tastaturkürzel anzeigen" },
  { keys: ["/"], description: "Kundensuche fokussieren" },
  { keys: ["Esc"], description: "Panel schließen / Suche verlassen" },
  { keys: ["↑", "↓"], description: "Liste navigieren" },
  { keys: ["Enter"], description: "Kunde auswählen" },
];

function KeyChip({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-border bg-card px-1.5 text-xs font-medium text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog() {
  const open = useAppStore((s) => s.shortcutsDialogOpen);
  const setOpen = useAppStore((s) => s.setShortcutsDialogOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tastaturkürzel</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-3 py-2 text-sm">
          {SHORTCUTS.map((s) => (
            <li key={s.description} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{s.description}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, idx) => (
                  <span key={k + idx} className="flex items-center gap-1">
                    <KeyChip>{k}</KeyChip>
                    {idx < s.keys.length - 1 ? (
                      <span className="text-xs text-muted-foreground">+</span>
                    ) : null}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
