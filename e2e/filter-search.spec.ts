import { test, expect } from "@playwright/test";

test.describe("Filter & search", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Sidebar tests run on desktop chromium",
  );

  test("renders sidebar with filter sections", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByLabel("Sidebar mit Kundenliste und Filtern")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("Status-Filter")).toBeVisible();
    await expect(page.getByLabel("Kundentyp-Filter")).toBeVisible();
    await expect(page.getByLabel("Gewerk-Filter")).toBeVisible();
  });

  test("typing into search updates the list", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const search = page.getByLabel("Kundensuche");
    await search.fill("Hofer");
    await expect(page.getByText(/Hofer/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("status filter toggles list count", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page
      .getByRole("button", { name: /Status VIP/ })
      .first()
      .click();
    await expect(page.getByText("Gefiltert")).toBeVisible({ timeout: 5_000 });
  });

  test("'/' hotkey focuses the search input", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(500);
    await page.keyboard.press("/");
    await expect(page.getByLabel("Kundensuche")).toBeFocused();
  });
});
