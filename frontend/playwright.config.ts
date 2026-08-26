import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.DQI_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  testMatch: ["demo-inspector.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 120000,
  expect: {
    timeout: 20000,
  },
  use: {
    // ✅ Tek kaynak: baseURL
    baseURL: BASE_URL,

    // Debug / artifacts
    trace: "on-first-retry",
    screenshot: "only-on-failure",

    // Timeouts
    actionTimeout: 15000,
    navigationTimeout: 60000,

    // DQI stabilitesi için faydalı (isteğe bağlı ama önerilir)
    // ignoreHTTPSErrors: true,
    // locale: "tr-TR",
    // timezoneId: "Europe/Istanbul",
  },
  reporter: [["list"]],
});
