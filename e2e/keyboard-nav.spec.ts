import { test, expect } from "@playwright/test";

test.describe("Keyboard navigation", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Run on desktop only");

  test("? opens shortcuts dialog", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(800);
    await page.keyboard.press("Shift+/");
    await expect(page.getByRole("dialog", { name: /Tastaturkürzel/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("ArrowDown selects first customer in list", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(800);
    await page.locator("body").click({ position: { x: 700, y: 400 } });
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(400);
    // Either a SheetContent or detail visible
    const detail = page.locator('[role="dialog"]');
    await expect(detail.first()).toBeVisible({ timeout: 5_000 });
  });

  test("Escape closes detail panel", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(800);
    await page.locator("body").click({ position: { x: 700, y: 400 } });
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // Detail should not show 'Notizen' tab
    await expect(page.getByRole("tab", { name: "Notizen" })).toHaveCount(0);
  });
});
