import { test, expect } from "@playwright/test";

test.describe("Welt route", () => {
  test("welt route loads the customer page", async ({ page }) => {
    await page.goto("/welt/c-001?onboarding=skip");
    // Either the canvas mounts (Google key present) or the unavailable shell appears.
    await expect(page).toHaveTitle(/Villa Hofer.*3D|3D.*Villa Hofer|nicht gefunden/i, {
      timeout: 10_000,
    });
    // Customer name is rendered somewhere in the DOM in both paths.
    await expect(page.locator("body")).toContainText("Villa Hofer");
  });

  test("shows a 404 fallback for an unknown customer", async ({ page }) => {
    await page.goto("/welt/does-not-exist?onboarding=skip");
    // Next.js may stream the response, so we check the rendered 404 marker
    // rather than the initial HTTP status which can be 200 during streaming.
    await expect(page).toHaveTitle(/404|nicht gefunden/i, { timeout: 10_000 });
  });

  test("opengraph-image responds with a PNG", async ({ request }) => {
    const response = await request.get("/welt/c-001/opengraph-image");
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/image\/(png|jpeg)/);
  });
});
