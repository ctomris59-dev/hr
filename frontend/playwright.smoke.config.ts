import { defineConfig, devices } from "@playwright/test";

const baseURL=process.env.FUTUREHR_BASE_URL||"http://127.0.0.1:3000";
export default defineConfig({
  testDir:".",testMatch:["futurehr-smoke.spec.ts"],fullyParallel:false,workers:1,retries:process.env.CI?1:0,timeout:45_000,expect:{timeout:10_000},reporter:[["line"]],
  use:{baseURL,locale:"tr-TR",timezoneId:"Europe/Istanbul",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[
    {name:"desktop",use:{...devices["Desktop Chrome"]}},
    {name:"mobile",use:{...devices["iPhone 13"]}},
  ],
  webServer:process.env.FUTUREHR_BASE_URL?undefined:{command:"npm run dev -- --hostname 127.0.0.1",url:baseURL,reuseExistingServer:!process.env.CI,timeout:60_000},
});
