"use client";

import { motion } from "motion/react";
import { Calendar, Check, Clock, Sprout } from "lucide-react";
import { formatLongDate, relativeDays } from "@/lib/format";
import type { Customer } from "@/lib/customers";

type Event = {
  id: string;
  label: string;
  date: string;
  state: "past" | "upcoming" | "today";
  Icon: React.ComponentType<{ className?: string }>;
};

function makeEvents(customer: Customer): Event[] {
  const now = new Date();
  const lastVisit = new Date(customer.lastVisit);
  const next = customer.nextAppointment ? new Date(customer.nextAppointment) : null;
  const events: Event[] = [
    {
      id: "since",
      label: "Stammkunde seit",
      date: customer.customerSince,
      state: "past",
      Icon: Sprout,
    },
    {
      id: "last",
      label: "Letzter Einsatz",
      date: customer.lastVisit,
      state: lastVisit > now ? "upcoming" : "past",
      Icon: Check,
    },
  ];
  if (next) {
    const sameDay = next.toDateString() === now.toDateString();
    events.push({
      id: "next",
      label: "Nächster Termin",
      date: customer.nextAppointment!,
      state: sameDay ? "today" : next > now ? "upcoming" : "past",
      Icon: Calendar,
    });
  } else {
    events.push({
      id: "next-missing",
      label: "Nächster Termin",
      date: "Noch nicht geplant",
      state: "upcoming",
      Icon: Clock,
    });
  }
  return events;
}

type Props = {
  customer: Customer;
};

export function Timeline({ customer }: Props) {
  const events = makeEvents(customer);

  return (
    <ol className="border-border relative ml-3 flex flex-col gap-5 border-l pl-6">
      {events.map((evt, idx) => {
        const Icon = evt.Icon;
        const valid = !Number.isNaN(new Date(evt.date).getTime());
        return (
          <motion.li
            key={evt.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.06 }}
            className="relative flex flex-col gap-0.5"
          >
            <span
              className={`border-background absolute top-1 -left-[35px] flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                evt.state === "today"
                  ? "bg-vip shadow-glow-vip"
                  : evt.state === "upcoming"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground"
              }`}
              aria-hidden
            >
              <Icon className="h-3 w-3" />
            </span>
            <span className="text-muted-foreground text-xs">{evt.label}</span>
            <span className="text-sm font-medium">
              {valid ? formatLongDate(evt.date) : evt.date}
            </span>
            {valid ? (
              <span className="text-muted-foreground text-[11px]">{relativeDays(evt.date)}</span>
            ) : null}
          </motion.li>
        );
      })}
    </ol>
  );
}
