import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const isCI = Boolean(process.env["CI"]);

// When BASE_URL is set (e.g. the production URL), tests run against that
// deployment and no local server is started.
const externalBaseURL = process.env["BASE_URL"];
const localBaseURL = `http://localhost:${String(PORT)}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseURL ?? localBaseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(externalBaseURL === undefined && {
    webServer: {
      // CI has already run `pnpm build` as part of `pnpm check`.
      command: isCI
        ? `pnpm start --port ${String(PORT)}`
        : `pnpm build && pnpm start --port ${String(PORT)}`,
      url: localBaseURL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
  }),
});
