import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { customers, type Customer } from "@/lib/customers";
import { getPrimaryHotspot } from "@/lib/welt/hotspot-registry";
import { getWeltEnvStatus } from "@/lib/welt/env-check";
import { getMappingForCustomer } from "@/lib/customers/splat-store";
import { WeltShell } from "@/components/welt/welt-shell";
import { MarbleWeltShell } from "@/components/welt/marble-welt-shell";
import { MarbleStatusShell } from "@/components/welt/marble-status-shell";

// Splat-Mappings ändern sich zur Laufzeit (Cron schreibt sie), daher dynamic.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function findCustomer(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { customerId } = await params;
  const customer = findCustomer(customerId);
  if (!customer) {
    return { title: "Welt nicht gefunden — StammKundenMap" };
  }
  const title = `${customer.name} — Begehbare 3D-Welt`;
  const description = `Tauchen Sie ein in eine photorealistische 3D-Welt rund um ${customer.address.street}, ${customer.address.postalCode} ${customer.address.city}. Gartengestaltung Gaigg StammKundenMap.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// Liste der bekannten Customer-IDs als Hint; tatsächliches Routing bleibt dynamic.
export function generateStaticParams() {
  return customers.map((c) => ({ customerId: c.id }));
}

export default async function WeltCustomerPage({ params, searchParams }: PageProps) {
  const { customerId } = await params;
  const search = await searchParams;
  const customer = findCustomer(customerId);
  if (!customer) {
    notFound();
  }

  const env = getWeltEnvStatus();
  const hotspot = getPrimaryHotspot(customer);
  const debug = search.debug === "1";
  const onboardingSkip = search.onboarding === "skip";

  const mapping = await getMappingForCustomer(customerId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: customer.name,
    description: `Begehbare 3D-Welt rund um ${customer.name} in ${customer.address.district}, ${customer.address.city}.`,
    address: {
      "@type": "PostalAddress",
      streetAddress: customer.address.street,
      postalCode: customer.address.postalCode,
      addressLocality: customer.address.city,
      addressCountry: "AT",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: customer.coordinates[1],
      longitude: customer.coordinates[0],
    },
  };

  // Wenn ein Marble-Splat existiert, ist der Spark-Renderer der Hauptpfad —
  // unabhängig davon ob Google 3D Tiles konfiguriert sind.
  if (mapping.status === "ready" && mapping.worlds.length > 0) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MarbleWeltShell customer={customer} worlds={mapping.worlds} />
      </>
    );
  }

  if (mapping.status === "processing" || mapping.status === "failed") {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MarbleStatusShell
          customer={customer}
          status={mapping.status}
          errorMessage={mapping.errorMessage}
          startedAt={mapping.startedAt}
        />
      </>
    );
  }

  // Status === "none": Wenn Google 3D Tiles verfügbar sind, zeigen wir die
  // Drohnen-Anflug-Welt als Vorschau-Erlebnis. Sonst schlagen wir Capture vor.
  if (!env.googleTiles) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MarbleStatusShell customer={customer} status="none" />
      </>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a
        href="#welt-canvas"
        className="absolute z-[60] -translate-y-full bg-emerald-600 px-3 py-2 text-xs text-white focus:translate-y-0"
      >
        Zum Welt-Canvas springen
      </a>
      <WeltShell
        customer={customer}
        hotspot={hotspot ?? null}
        env={env}
        debug={debug}
        skipOnboarding={onboardingSkip}
      />
    </>
  );
}
