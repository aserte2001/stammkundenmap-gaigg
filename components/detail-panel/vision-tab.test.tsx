import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VisionTab } from "./vision-tab";
import type { Customer } from "@/lib/customers";

const baseCustomer: Customer = {
  id: "c-001",
  name: "Villa Hofer",
  type: "privat",
  address: {
    street: "Pöstlingbergstraße 12",
    city: "Linz",
    postalCode: "4040",
    district: "Pöstlingberg",
  },
  coordinates: [14.2515, 48.3175],
  status: "vip",
  services: ["rasenpflege"],
  gardenType: "ziergarten",
  gardenSizeM2: 1850,
  customerSince: "2018-04-12",
  lastVisit: "2026-04-28",
  yearlyRevenueEur: 18400,
  notes: "",
  photoUrl: "/photos/c-001.svg",
};

describe("VisionTab", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the disclaimer + generator button when available", () => {
    render(<VisionTab customer={baseCustomer} available />);
    expect(screen.getByText(/KI-Konzept/i)).toBeInTheDocument();
    expect(screen.getByTestId("vision-generate")).toBeInTheDocument();
  });

  it("renders the deactivated state when unavailable", () => {
    render(<VisionTab customer={baseCustomer} available={false} />);
    expect(screen.getByText(/Vision-Tab ist aktuell deaktiviert/i)).toBeInTheDocument();
  });

  it("calls the API and renders the returned image on success", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            cached: false,
            dataUrl: "data:image/png;base64,AAAA",
            promptUsed: "test prompt",
            durationMs: 1234,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    render(<VisionTab customer={baseCustomer} available />);
    const generate = screen.getByTestId("vision-generate");
    fireEvent.click(generate);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledOnce();
    });
    const img = await screen.findByRole("img", { name: /KI-Konzept/i });
    expect(img.getAttribute("src")).toBe("data:image/png;base64,AAAA");
  });

  it("shows a rate-limit error when the API returns 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "Retry-After": "42", "Content-Type": "application/json" },
      }),
    );
    render(<VisionTab customer={baseCustomer} available />);
    fireEvent.click(screen.getByTestId("vision-generate"));
    await screen.findByText(/Zu viele Anfragen/i);
  });

  it("changes style and season selectors", () => {
    render(<VisionTab customer={baseCustomer} available />);
    const japanisch = screen.getByRole("button", { name: "Japanisch" });
    fireEvent.click(japanisch);
    expect(japanisch).toHaveAttribute("aria-pressed", "true");
    const winter = screen.getByRole("button", { name: "Winter" });
    fireEvent.click(winter);
    expect(winter).toHaveAttribute("aria-pressed", "true");
  });
});
