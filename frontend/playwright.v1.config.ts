import { defineConfig, devices } from "@playwright/test";

const baseURL=process.env.FUTUREHR_BASE_URL||"http://127.0.0.1:3000";
export default defineConfig({
  testDir:".",
  testMatch:[
    "futurehr-v1.spec.ts",
    "futurehr-intelligence-golden.spec.ts",
    "access-hierarchy.spec.ts",
    "readability.spec.ts",
    "role-fit-v2.spec.ts",
    "visual-decision-system.spec.ts",
    "notification-audience.spec.ts",
  ],
  fullyParallel:false,
  workers:1,
  retries:process.env.CI?1:0,
  timeout:60_000,
  expect:{timeout:10_000},
  reporter:[["line"],["html",{open:"never",outputFolder:"playwright-report"}]],
  use:{baseURL,locale:"tr-TR",timezoneId:"Europe/Istanbul",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:process.env.FUTUREHR_BASE_URL?undefined:{command:"npm run start -- --hostname 127.0.0.1",url:baseURL,reuseExistingServer:!process.env.CI,timeout:90_000},
});