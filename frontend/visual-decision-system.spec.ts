import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("fhr_demo_tour_seen_v1", "1"));
  await page.goto("/");
  await page.getByRole("button", { name: "V1 Demo'yu Aç" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByTestId("app-shell")).toBeVisible();
}

test("core decision modules expose a visibly prominent executive decision layout", async ({ page }) => {
  await openDemo(page);
  const routes = ["/degerlendirme", "/yetenek-matrisi", "/gelisim", "/maas", "/ise-alim"];
  for (const route of routes) {
    await page.goto(route);

    const workspace = page.locator(".module-workspace-v2");
    const commandHero = workspace.locator(".module-command-hero");
    const commandTitle = commandHero.locator("h1");
    await expect(commandHero, `${route} command hero`).toBeVisible();
    const heroGeometry = await commandHero.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      radius: getComputedStyle(element).borderRadius,
    }));
    const titleFont = await commandTitle.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(heroGeometry.height).toBeGreaterThanOrEqual(190);
    expect(Number.parseFloat(heroGeometry.radius)).toBeGreaterThanOrEqual(20);
    expect(titleFont).toBeGreaterThanOrEqual(28);

    const summary = page.getByTestId("visual-decision-summary");
    await expect(summary, `${route} visual summary`).toBeVisible();
    await expect(summary.locator(".visual-kpi-card")).toHaveCount(4);
    await expect(summary.locator(".visual-decision-lower-grid")).toBeVisible();
    await expect(summary.getByText("Karar notları", { exact: true })).toBeVisible();

    const geometry = await summary.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: element.scrollWidth,
      height: element.getBoundingClientRect().height,
    }));
    const kpiFont = await summary.locator(".visual-kpi-value").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const barHeight = await summary.locator(".visual-bar-track").first().evaluate((element) => element.getBoundingClientRect().height);
    expect(geometry.width).toBeGreaterThan(600);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(Math.ceil(geometry.width) + 2);
    expect(geometry.height).toBeGreaterThan(500);
    expect(geometry.height).toBeLessThan(660);
    expect(kpiFont).toBeGreaterThanOrEqual(30);
    expect(barHeight).toBeGreaterThanOrEqual(9);

    const detailStage = workspace.locator(".module-detail-stage");
    await expect(detailStage).toBeVisible();
    await expect(detailStage.getByRole("heading", { name: "Detaylı çalışma alanı" })).toBeVisible();
  }
});

test("visual decision system remains empty-first before demo creation", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("fhr_demo_tour_seen_v1", "1");
  });
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
  await page.goto("/degerlendirme");
  await expect(page.getByTestId("visual-decision-summary")).toHaveCount(0);
});
