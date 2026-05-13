import { test, expect } from "@playwright/test";

test.describe("Map interaction", () => {
  test("loads the map container with the Logo header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Gartengestaltung Gaigg")).toBeVisible();
    await expect(page.getByTestId("map-container")).toBeVisible({ timeout: 15_000 });
  });

  test("renders the style switcher with both presets", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Karten-Stil Atmosphäre")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Karten-Stil Satellit")).toBeVisible();
  });
});
