import { test, expect } from "@playwright/test";

test.describe("prefers-reduced-motion", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Run on desktop only");

  test("reduces map intro animation when prefers-reduced-motion is set", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(1500);
    // After reduced-motion init, intro overlay should not be visible
    await expect(page.getByText("Globus → Linz")).toHaveCount(0);
    await ctx.close();
  });

  test("css animations honor reduced motion (no twinkle pulse durations)", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const duration = await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "animate-twinkle";
      document.body.appendChild(el);
      const value = window.getComputedStyle(el).animationDuration;
      document.body.removeChild(el);
      return value;
    });
    expect(duration).toMatch(/0\.001ms|0s/);
    await ctx.close();
  });
});
