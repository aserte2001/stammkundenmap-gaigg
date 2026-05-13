const LOCALE = "de-AT";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, {
  numeric: "auto",
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

const hectareFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export function formatArea(squareMeters: number): string {
  if (squareMeters >= 10_000) {
    const hectares = squareMeters / 10_000;
    return `${hectareFormatter.format(hectares)} ha`;
  }
  return `${numberFormatter.format(squareMeters)} m²`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatLongDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return longDateFormatter.format(date);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function relativeDays(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffDays = Math.round((date.getTime() - now.getTime()) / DAY_MS);
  if (diffDays === 0) return "heute";
  if (Math.abs(diffDays) < 30) return relativeFormatter.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 24) return relativeFormatter.format(diffMonths, "month");
  return relativeFormatter.format(Math.round(diffDays / 365), "year");
}

const STATUS_LABELS = {
  aktiv: "Aktiv",
  "wartung-faellig": "Wartung fällig",
  "saison-pause": "Saison-Pause",
  neu: "Neu",
  vip: "VIP",
} as const;

const TYPE_LABELS = {
  privat: "Privat",
  gewerbe: "Gewerbe",
  oeffentlich: "Öffentlich",
} as const;

const SERVICE_LABELS = {
  rasenpflege: "Rasenpflege",
  heckenschnitt: "Heckenschnitt",
  baumpflege: "Baumpflege",
  bewaesserung: "Bewässerung",
  pflanzplanung: "Pflanzplanung",
  winterdienst: "Winterdienst",
  teichbau: "Teichbau",
  natursteinarbeiten: "Natursteinarbeiten",
} as const;

const GARDEN_TYPE_LABELS = {
  ziergarten: "Ziergarten",
  nutzgarten: "Nutzgarten",
  dachgarten: "Dachgarten",
  park: "Park",
  firmengelaende: "Firmengelände",
  gastgarten: "Gastgarten",
} as const;

export function formatStatus(status: keyof typeof STATUS_LABELS): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatType(type: keyof typeof TYPE_LABELS): string {
  return TYPE_LABELS[type] ?? type;
}

export function formatService(service: keyof typeof SERVICE_LABELS): string {
  return SERVICE_LABELS[service] ?? service;
}

export function formatGardenType(gardenType: keyof typeof GARDEN_TYPE_LABELS): string {
  return GARDEN_TYPE_LABELS[gardenType] ?? gardenType;
}

export const labels = {
  status: STATUS_LABELS,
  type: TYPE_LABELS,
  service: SERVICE_LABELS,
  gardenType: GARDEN_TYPE_LABELS,
} as const;
