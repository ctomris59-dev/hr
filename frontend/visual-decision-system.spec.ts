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
    const heroGeometry = await commandHero.evaluate((element) => ({ height: element.getBoundingClientRect().height, radius: getComputedStyle(element).borderRadius }));
    const titleFont = await commandTitle.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(heroGeometry.height).toBeGreaterThanOrEqual(70);
    expect(Number.parseFloat(heroGeometry.radius)).toBeGreaterThanOrEqual(10);
    expect(titleFont).toBeGreaterThanOrEqual(18);
    const activeBoard = route === "/degerlendirme" || route === "/gelisim" ? workspace.locator(".futurehr-analytics-board").first() : workspace.locator(":scope > section.mb-5").first();
    await expect(activeBoard, `${route} active analytics board`).toBeVisible();
    const geometry = await activeBoard.evaluate((element) => ({ width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth, height: element.getBoundingClientRect().height }));
    expect(geometry.width).toBeGreaterThan(600);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(Math.ceil(geometry.width) + 2);
    expect(geometry.height).toBeGreaterThan(200);
    await expect(workspace.locator(".module-decision-stage")).toBeHidden();
    const detailStage = workspace.locator(".module-detail-stage");
    await expect(detailStage).toBeVisible();
    await expect(detailStage.locator(".module-detail-stage-header h2").first()).toBeVisible();
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
