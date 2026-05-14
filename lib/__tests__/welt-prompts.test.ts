import { describe, expect, it } from "vitest";
import {
  GARDEN_SEASONS,
  GARDEN_STYLES,
  buildPrompt,
  isGardenSeason,
  isGardenStyle,
} from "@/lib/openai/prompts";

const fakeCustomer = {
  name: "Villa Hofer",
  address: {
    street: "Pöstlingbergstraße 12",
    postalCode: "4040",
    city: "Linz",
    district: "Pöstlingberg",
  },
  gardenType: "ziergarten" as const,
  gardenSizeM2: 1850,
};

describe("prompt builder", () => {
  it("includes location context", () => {
    const prompt = buildPrompt({ customer: fakeCustomer, style: "modern", season: "sommer" });
    expect(prompt).toContain("Pöstlingbergstraße 12");
    expect(prompt).toContain("4040 Linz");
    expect(prompt).toContain("Pöstlingberg");
  });

  it("includes style mood", () => {
    const prompt = buildPrompt({ customer: fakeCustomer, style: "japanisch", season: "sommer" });
    expect(prompt.toLowerCase()).toContain("zengarten");
  });

  it("includes season light", () => {
    const prompt = buildPrompt({ customer: fakeCustomer, style: "modern", season: "herbst" });
    expect(prompt.toLowerCase()).toContain("golden");
  });

  it("never references logos or text overlays", () => {
    const prompt = buildPrompt({ customer: fakeCustomer, style: "modern", season: "sommer" });
    expect(prompt).toMatch(/no logos/);
    expect(prompt).toMatch(/no text overlays/);
  });

  it("style type-guard rejects rubbish input", () => {
    expect(isGardenStyle("modern")).toBe(true);
    expect(isGardenStyle("punk")).toBe(false);
    expect(isGardenStyle(123)).toBe(false);
    expect(isGardenStyle(undefined)).toBe(false);
  });

  it("season type-guard rejects rubbish input", () => {
    expect(isGardenSeason("winter")).toBe(true);
    expect(isGardenSeason("rainy")).toBe(false);
    expect(isGardenSeason(null)).toBe(false);
  });

  it("style + season lists are consistent", () => {
    expect(GARDEN_STYLES.length).toBe(4);
    expect(GARDEN_SEASONS.length).toBe(4);
  });
});
