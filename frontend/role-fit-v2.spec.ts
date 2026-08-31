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

test("role fit v2 is employee scoped and visual instead of a global role-link list", async ({ page }) => {
  await openDemo(page);
  await page.goto("/yetkinlik-haritasi");

  await expect(page.getByTestId("role-fit-v2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rol Uyum Grafiği" })).toBeVisible();
  await expect(page.getByLabel("Rol uyumu çalışan seçimi")).toBeVisible();
  await expect(page.getByText("Yetkinlik Farkları", { exact: true })).toBeVisible();
  await expect(page.getByTestId("role-fit-gap-chart")).toBeVisible();

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
    }
  }
});
