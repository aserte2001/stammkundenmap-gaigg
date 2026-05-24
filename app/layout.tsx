import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { BRAND } from "@/components/brand/brand-tokens";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const SITE_URL = `https://${BRAND.domain}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.companyName} — Stammkunden-Map`,
    template: `%s · ${BRAND.companyName}`,
  },
  description: `Interaktive Premium-Karte unserer Stammkunden in ${BRAND.city} und Umgebung. ${BRAND.tagline}.`,
  applicationName: BRAND.companyName,
  authors: [{ name: BRAND.companyName }],
  generator: "Next.js",
  keywords: [
    "Gartengestaltung",
    "Gartenpflege",
    "Linz",
    "Oberösterreich",
    "Stammkunden",
    "Premium",
    "Landschaftsbau",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "de_AT",
    url: SITE_URL,
    siteName: BRAND.companyName,
    title: `${BRAND.companyName} — Stammkunden-Map`,
    description: `Premium-Karte unserer Stammkunden in ${BRAND.city} und Umgebung.`,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.companyName} — Stammkunden-Map`,
    description: `Premium-Karte unserer Stammkunden in ${BRAND.city} und Umgebung.`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1a0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: BRAND.companyName,
  description: BRAND.tagline,
  email: BRAND.email,
  telephone: BRAND.phone,
  address: {
    "@type": "PostalAddress",
    addressLocality: BRAND.city,
    addressRegion: BRAND.region,
    addressCountry: "AT",
  },
  url: SITE_URL,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de-AT"
      className={`${GeistSans.variable} ${GeistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
