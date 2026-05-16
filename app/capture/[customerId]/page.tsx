import { notFound } from "next/navigation";
import { customersById } from "@/lib/customers";
import { GuidedCapture } from "@/components/capture/guided-capture";

type Params = Promise<{ customerId: string }>;

export default async function CapturePage({ params }: { params: Params }) {
  const { customerId } = await params;
  const customer = customersById[customerId];
  if (!customer) {
    notFound();
  }
  return (
    <GuidedCapture
      customerId={customer.id}
      customerName={customer.name}
      customerAddress={`${customer.address.street}, ${customer.address.postalCode} ${customer.address.city}`}
    />
  );
}

export function generateMetadata({ params }: { params: Params }) {
  return params.then(({ customerId }) => {
    const customer = customersById[customerId];
    return {
      title: customer
        ? `Capture – ${customer.name} | Stammkundenmap Gaigg`
        : "Capture | Stammkundenmap Gaigg",
      // No-index: this is an admin-only working tool, not a public page.
      robots: { index: false, follow: false },
    };
  });
}
