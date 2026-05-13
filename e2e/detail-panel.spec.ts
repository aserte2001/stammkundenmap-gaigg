import { test, expect } from "@playwright/test";

test.describe("Detail panel", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Run on desktop only");

  test("opens via command palette and shows tabs", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(800);

    const isMac = process.platform === "darwin";
    await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
    await page.waitForTimeout(200);
    await page.keyboard.type("Wolfinger");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");

    await expect(page.getByText(/Hotel Wolfinger/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("tab", { name: "Übersicht" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Aufträge" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Notizen" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "3D-View" })).toBeVisible();
  });

  test("closes detail panel via Escape", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(800);

    const isMac = process.platform === "darwin";
    await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
    await page.waitForTimeout(200);
    await page.keyboard.type("Hofer");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Villa Hofer/i).first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Villa Hofer/i)).toHaveCount(0, { timeout: 5_000 });
  });
});
