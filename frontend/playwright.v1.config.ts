import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.FUTUREHR_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: ".",
  testMatch: ["futurehr-v1.spec.ts", "readability.spec.ts", "role-fit-v2.spec.ts", "visual-decision-system.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: process.env.CI ? [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.FUTUREHR_BASE_URL ? undefined : {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});