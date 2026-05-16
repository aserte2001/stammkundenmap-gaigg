import { test, expect } from "@playwright/test";

test("Capture-CTA in DetailPanel zeigt eine 3D-Welt-Aktion und verlinkt korrekt", async ({
  page,
}) => {
  await page.goto("/?customer=c-001");
  const cta = page.getByTestId("capture-cta");
  await expect(cta).toBeVisible({ timeout: 10_000 });
  // Inside the CTA we always have at least one outbound link to either
  // /capture/c-001 (status none/failed) or /welt/c-001 (status ready/processing).
  const links = cta.locator("a");
  await expect(links.first()).toBeVisible();
  const href = await links.first().getAttribute("href");
  expect(href).toMatch(/\/(capture|welt)\/c-001/);
});

test("Vision-Tab-Trigger ist sichtbar im DetailPanel", async ({ page }) => {
  await page.goto("/?customer=c-001");
  // Radix Tabs only mounts the active panel — full Vision-Tab content is
  // exercised in the component test (components/detail-panel/vision-tab.test.tsx).
  // Here we verify only that the trigger is exposed and the panel is wired.
  const visionTab = page.getByRole("tab", { name: "Vision" });
  await expect(visionTab).toBeVisible({ timeout: 10_000 });
  await expect(visionTab).toHaveAttribute("aria-controls");
});
