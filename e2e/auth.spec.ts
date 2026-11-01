import { expect, test } from "@playwright/test";

// Pages and redirects work without a database, so these run everywhere,
// including CI.
test.describe("auth pages", () => {
  test("sign-up page shows the form", async ({ page }) => {
    await page.goto("/sign-up");

    await expect(page).toHaveTitle("Create account · CRM");
    await expect(
      page.getByRole("heading", { level: 1, name: "Create an account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("sign-in page shows the form", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page).toHaveTitle("Sign in · CRM");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("the dashboard redirects to sign-in when signed out", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("home links to sign-up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/sign-up$/);
  });
});

// The full flow writes to a real database. It runs only where one is
// configured: set E2E_AUTH=1 (locally against the Neon dev branch, or against
// a preview deployment with BASE_URL).
test.describe("sign-up → dashboard → sign-out → sign-in", () => {
  test.skip(
    process.env["E2E_AUTH"] !== "1",
    "needs a database: set E2E_AUTH=1",
  );

  test("a new user can register, sign out and sign back in", async ({
    page,
  }) => {
    const email = `e2e-${String(Date.now())}@example.com`;
    const password = "e2e password long enough";

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("E2E User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome, E2E User" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Invalid email or password.",
    );

    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  });

  test("registering the same email twice shows an error", async ({ page }) => {
    const email = `e2e-dup-${String(Date.now())}@example.com`;

    for (const attempt of [1, 2]) {
      await page.goto("/sign-up");
      await page.getByLabel("Name").fill(`Attempt ${String(attempt)}`);
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill("duplicate password");
      await page.getByRole("button", { name: "Create account" }).click();
      if (attempt === 1) {
        await expect(page).toHaveURL(/\/dashboard$/);
        await page.context().clearCookies();
      }
    }

    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Could not create the account",
    );
  });
});
