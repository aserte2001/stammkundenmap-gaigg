import { test, expect } from "@playwright/test";

test.describe("Vision API guard", () => {
  test("GET /api/vision/generate reports availability", async ({ request }) => {
    const response = await request.get("/api/vision/generate");
    // Either 200 (when OPENAI_API_KEY is set) or 503 (when missing).
    expect([200, 503]).toContain(response.status());
    const json = await response.json();
    expect(typeof json.ok).toBe("boolean");
  });

  test("POST without payload returns 400 (or 503 when API disabled)", async ({ request }) => {
    const response = await request.post("/api/vision/generate", {
      data: { foo: "bar" },
    });
    expect([400, 503]).toContain(response.status());
  });
});
