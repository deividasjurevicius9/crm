import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("responds with HTTP 200", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.status()).toBe(200);
  });

  test("has the CRM document title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("CRM");
  });

  test("shows the product heading", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "CRM" }),
    ).toBeVisible();
  });

  test("declares English as the document language", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("logs no console errors while loading", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(errors).toEqual([]);
  });
});
