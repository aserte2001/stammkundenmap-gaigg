import { Logo } from "@/components/brand/logo";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-6">
        <Logo size={96} />
        <h1 className="text-3xl font-bold tracking-tight">Stammkunden-Map</h1>
        <p className="text-muted-foreground">Karte wird geladen…</p>
      </div>
    </main>
  );
}
