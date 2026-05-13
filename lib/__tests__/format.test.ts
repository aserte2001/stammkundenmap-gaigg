import { describe, expect, it } from "vitest";
import {
  formatArea,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatGardenType,
  formatLongDate,
  formatNumber,
  formatService,
  formatStatus,
  formatType,
  relativeDays,
} from "../format";

describe("formatCurrency", () => {
  it("formats EUR amounts in de-AT locale", () => {
    expect(formatCurrency(1234)).toMatch(/€/);
    expect(formatCurrency(1234)).toContain("1");
    expect(formatCurrency(1234)).toContain("234");
  });

  it("renders zero without errors", () => {
    expect(formatCurrency(0)).toContain("0");
  });

  it("renders compact currency with K/Mio suffixes", () => {
    const result = formatCompactCurrency(125_000);
    expect(result).toMatch(/€/);
  });
});

describe("formatNumber", () => {
  it("groups thousands with non-breaking space (de-AT)", () => {
    const result = formatNumber(12345);
    expect(result.replace(/\s/g, "")).toBe("12345");
  });
});

describe("formatArea", () => {
  it("renders square meters under 10_000", () => {
    expect(formatArea(420)).toBe("420 m²");
  });

  it("renders hectares for large gardens", () => {
    expect(formatArea(38_000)).toMatch(/ha/);
    expect(formatArea(38_000)).toContain("3,8");
  });
});

describe("formatDate", () => {
  it("formats ISO dates in DD.MM.YYYY style", () => {
    expect(formatDate("2026-05-13")).toBe("13.05.2026");
  });

  it("renders em-dash for invalid input", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("renders long date with month name", () => {
    expect(formatLongDate("2026-05-13")).toContain("Mai");
  });
});

describe("relativeDays", () => {
  it("returns 'heute' for the same day", () => {
    const now = new Date("2026-05-13T12:00:00Z");
    expect(relativeDays("2026-05-13T08:00:00Z", now)).toBe("heute");
  });

  it("returns a German future-day phrase for near dates", () => {
    const now = new Date("2026-05-13T00:00:00Z");
    const result = relativeDays("2026-05-15T00:00:00Z", now);
    expect(result).toMatch(/übermorgen|in 2 Tagen/);
  });

  it("returns a past-day phrase for recent dates", () => {
    const now = new Date("2026-05-13T00:00:00Z");
    const result = relativeDays("2026-05-08T00:00:00Z", now);
    expect(result.toLowerCase()).toMatch(/vor 5 tagen|vor 5 t/);
  });

  it("returns months for medium distance dates", () => {
    const now = new Date("2026-05-13T00:00:00Z");
    const result = relativeDays("2026-09-13T00:00:00Z", now);
    expect(result.toLowerCase()).toMatch(/monat/);
  });

  it("falls back to em-dash for invalid input", () => {
    expect(relativeDays("invalid")).toBe("—");
  });
});

describe("label mappers", () => {
  it("renders German labels for status", () => {
    expect(formatStatus("vip")).toBe("VIP");
    expect(formatStatus("wartung-faellig")).toBe("Wartung fällig");
  });

  it("renders German labels for type", () => {
    expect(formatType("oeffentlich")).toBe("Öffentlich");
  });

  it("renders German labels for service", () => {
    expect(formatService("natursteinarbeiten")).toBe("Natursteinarbeiten");
  });

  it("renders German labels for garden type", () => {
    expect(formatGardenType("firmengelaende")).toBe("Firmengelände");
  });
});
