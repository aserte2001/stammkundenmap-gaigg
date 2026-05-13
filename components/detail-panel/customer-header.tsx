"use client";

import Image from "next/image";
import { Crown, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatStatus, formatType } from "@/lib/format";
import type { Customer } from "@/lib/customers";

const STATUS_TINT: Record<Customer["status"], string> = {
  aktiv: "border-success/40 bg-success/10 text-success",
  neu: "border-info/40 bg-info/10 text-info",
  vip: "border-vip/50 bg-vip/15 text-vip",
  "wartung-faellig": "border-warning/40 bg-warning/10 text-warning",
  "saison-pause": "border-muted-foreground/40 bg-muted text-muted-foreground",
};

type Props = {
  customer: Customer;
};

export function CustomerHeader({ customer }: Props) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${customer.address.street}, ${customer.address.postalCode} ${customer.address.city}`,
  )}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-48 w-full overflow-hidden rounded-2xl">
        <Image
          src={customer.photoUrl}
          alt={`Garten von ${customer.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover"
          unoptimized
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
        {customer.status === "vip" ? (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-vip/95 px-2.5 py-1 text-xs font-semibold text-vip-foreground shadow-glow-vip">
            <Crown className="h-3 w-3" />
            VIP-Stammkunde
          </div>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
              {customer.name}
            </h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {customer.address.street}, {customer.address.postalCode} {customer.address.city}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`rounded-full ${STATUS_TINT[customer.status]}`}>
          {formatStatus(customer.status)}
        </Badge>
        <Badge variant="outline" className="rounded-full">
          {formatType(customer.type)}
        </Badge>
        <Badge variant="outline" className="rounded-full">
          {customer.address.district}
        </Badge>
        <Button asChild size="sm" variant="secondary" className="ml-auto gap-1.5 rounded-full">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-3 w-3" />
            Route planen
          </a>
        </Button>
      </div>
    </div>
  );
}
