import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("fhr_demo_tour_seen_v1", "1");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "V1 Demo'yu Aç" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByTestId("app-shell")).toBeVisible();
}

test("role fit v2 is employee scoped and renders a measured radar in the full demo", async ({ page }) => {
  await openDemo(page);
  await page.goto("/yetkinlik-haritasi");

  await expect(page.getByTestId("role-fit-v2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rol Uyum Grafiği" })).toBeVisible();
  await expect(page.getByLabel("Rol uyumu çalışan seçimi")).toBeVisible();
  await expect(page.getByText("Yetkinlik Farkları", { exact: true })).toBeVisible();
  await expect(page.getByTestId("role-fit-gap-chart")).toBeVisible();
  await expect(page.getByText("Radar için yeterli ölçüm yok", { exact: true })).toHaveCount(0);
  await expect(page.locator(".recharts-radar-polygon").first()).toBeVisible();

  await expect(page.getByText("Rol-yetkinlik bağı", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^\d+ bağ$/)).toHaveCount(0);

  const selector = page.getByLabel("Rol uyumu çalışan seçimi");
  const options = await selector.locator("option").count();
  expect(options).toBeGreaterThan(0);

  if (options > 1) {
    const secondValue = await selector.locator("option").nth(1).getAttribute("value");
    if (secondValue) {
      await selector.selectOption(secondValue);
      await expect(selector).toHaveValue(secondValue);
      await expect(page.getByTestId("role-fit-gap-chart")).toBeVisible();
      await expect(page.getByText("Radar için yeterli ölçüm yok", { exact: true })).toHaveCount(0);
    }
  }
});

test("demo lifecycle clears to an empty company and recreates a fully populated workspace", async ({ page }) => {
  await openDemo(page);
  await page.goto("/admin");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Demo Verilerini Temizle" }).click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("hr_org_chart") || "[]").length)).toBe(0);

  const emptySnapshot = await page.evaluate(() => ({
    org: JSON.parse(localStorage.getItem("hr_org_chart") || "[]").length,
    history: JSON.parse(localStorage.getItem("hr_history_360") || "[]").length,
    leave: JSON.parse(localStorage.getItem("hr_leave_requests") || "[]").length,
    development: JSON.parse(localStorage.getItem("hr_development_plans") || "[]").length,
    training: JSON.parse(localStorage.getItem("hr_training_assignments") || "[]").length,
    candidates: JSON.parse(localStorage.getItem("hr_candidates") || "[]").length,
    cycles: JSON.parse(localStorage.getItem("hr_compensation_cycles") || "[]").length,
    cleared: localStorage.getItem("hr_data_cleared"),
  }));
  expect(emptySnapshot).toEqual({ org: 0, history: 0, leave: 0, development: 0, training: 0, candidates: 0, cycles: 0, cleared: "true" });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "V1 Demo Verisini Oluştur" }).click();
  await page.waitForLoadState("domcontentloaded");
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("hr_org_chart") || "[]").length)).toBeGreaterThan(25);

  const fullSnapshot = await page.evaluate(() => {
    const read = (key: string) => JSON.parse(localStorage.getItem(key) || "[]");
    const history = read("hr_history_360");
    const competencyCodes = ["DIG", "ANA", "RES", "DET", "LRN", "ETH", "DIS", "STR", "TEA", "COM"];
    const measuredRows = history.filter((row: Record<string, unknown>) => competencyCodes.filter((code) => Number(row[code]) > 0).length >= 3).length;
    return {
      org: read("hr_org_chart").length,
      history: history.length,
      measuredRows,
      leave: read("hr_leave_requests").length,
      rewards: read("hr_reward_leave").length,
      notifications: read("hr_notifications").length,
      development: read("hr_development_plans").length,
      training: read("hr_training_assignments").length,
      candidates: read("hr_candidates").length,
      assessments: read("hr_assessments").length,
      candidateResults: read("hr_candidate_results").length,
      career: read("hr_career_profiles").length,
      cycles: read("hr_compensation_cycles").length,
      benchmarks: read("hr_market_benchmarks").length,
      pulse: read("hr_pulse_answers").length,
      users: Object.keys(JSON.parse(localStorage.getItem("hr_users") || "{}")).length,
      cleared: localStorage.getItem("hr_data_cleared"),
    };
  });

  expect(fullSnapshot.org).toBeGreaterThan(25);
  expect(fullSnapshot.history).toBeGreaterThanOrEqual(fullSnapshot.org * 2);
  expect(fullSnapshot.measuredRows).toBe(fullSnapshot.history);
  expect(fullSnapshot.leave).toBeGreaterThan(0);
  expect(fullSnapshot.rewards).toBeGreaterThan(0);
  expect(fullSnapshot.notifications).toBeGreaterThan(0);
  expect(fullSnapshot.development).toBeGreaterThan(0);
  expect(fullSnapshot.training).toBeGreaterThan(0);
  expect(fullSnapshot.candidates).toBeGreaterThan(0);
  expect(fullSnapshot.assessments).toBeGreaterThan(0);
  expect(fullSnapshot.candidateResults).toBeGreaterThan(0);
  expect(fullSnapshot.career).toBeGreaterThan(0);
  expect(fullSnapshot.cycles).toBeGreaterThan(0);
  expect(fullSnapshot.benchmarks).toBeGreaterThan(0);
  expect(fullSnapshot.pulse).toBeGreaterThan(0);
  expect(fullSnapshot.users).toBeGreaterThan(0);
  expect(fullSnapshot.cleared).toBeNull();

  await page.goto("/yetkinlik-haritasi");
  await expect(page.getByText("Radar için yeterli ölçüm yok", { exact: true })).toHaveCount(0);
  await expect(page.locator(".recharts-radar-polygon").first()).toBeVisible();
});
