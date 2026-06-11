import { defineConfig } from "@playwright/test";

/**
 * Smoke E2E against the PRODUCTION build (real CSP, real committed data).
 * `npm run build` must have run first — webServer only starts `next start`.
 * Kept to one fast spec: this is a render-the-real-data gate, not a UI suite.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100/api/health",
    // /api/health intentionally returns 503 in seed mode — the server is still up.
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
