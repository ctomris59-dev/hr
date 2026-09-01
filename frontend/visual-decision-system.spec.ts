import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("fhr_demo_tour_seen_v1", "1"));
  await page.goto("/");
  await page.getByRole("button", { name: "V1 Demo'yu Aç" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByTestId("app-shell")).toBeVisible();
}

test("core decision modules expose compact visual summaries", async ({ page }) => {
  await openDemo(page);
  const routes = ["/degerlendirme", "/yetenek-matrisi", "/gelisim", "/maas", "/ise-alim"];
  for (const route of routes) {
    await page.goto(route);
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
    expect(geometry.width).toBeGreaterThan(600);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(Math.ceil(geometry.width) + 2);
    expect(geometry.height).toBeLessThan(620);
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
