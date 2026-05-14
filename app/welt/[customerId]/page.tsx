import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { customers, type Customer } from "@/lib/customers";
import { getPrimaryHotspot } from "@/lib/welt/hotspot-registry";
import { getWeltEnvStatus } from "@/lib/welt/env-check";
import { WeltShell } from "@/components/welt/welt-shell";
import { WeltUnavailable } from "@/components/welt/welt-unavailable";

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

export function generateStaticParams() {
  return customers.map((c) => ({ customerId: c.id }));
}

export const dynamicParams = false;

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

  if (!env.googleTiles) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <WeltUnavailable
          customer={customer}
          reason="googleTiles"
          details="Die Photorealistic-3D-Tiles benötigen einen Google Map Tiles API-Key. Sobald NEXT_PUBLIC_GOOGLE_MAPS_API_KEY gesetzt ist, lädt die Welt automatisch."
        />
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
