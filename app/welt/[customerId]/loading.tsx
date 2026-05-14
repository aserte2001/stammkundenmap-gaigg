export default function WeltLoading() {
  return (
    <div className="bg-background text-foreground relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,oklch(0.42_0.06_148/0.6),transparent_70%)]" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative h-16 w-16">
          <div className="border-primary/40 border-t-primary absolute inset-0 animate-spin rounded-full border-2" />
          <div className="bg-primary/10 absolute inset-1 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-foreground text-base font-semibold tracking-tight">
            Linz wird gerendert…
          </span>
          <span className="text-muted-foreground text-xs">
            Photorealistic 3D Tiles + Luma-Splats werden geladen
          </span>
        </div>
        <div className="bg-muted h-1 w-48 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}
