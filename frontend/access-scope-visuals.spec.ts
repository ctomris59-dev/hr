import { expect, test, type Page } from "@playwright/test";

const DEFAULT_ROUTE_BY_ROLE = {
  ceo: "/dashboard",
  hr_admin: "/dashboard",
  manager: "/dashboard",
  employee: "/kullanici",
} as const;

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "V1 Demo'yu Aç" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByTestId("app-shell")).toBeVisible();
}

async function switchPersona(page: Page, role: "ceo" | "hr_admin" | "manager" | "employee") {
  const select = page.getByLabel("Demo persona seçimi");
  await expect(select).toBeVisible();
  await select.selectOption(role);
  await expect.poll(async () => page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("hr_current_user") || "null")?.role || null; }
    catch { return null; }
  })).toBe(role === "hr_admin" ? "IK" : role === "manager" ? "MANAGER" : role === "employee" ? "PERSONEL" : "CEO");
  await page.waitForURL(new RegExp(`${DEFAULT_ROUTE_BY_ROLE[role].replace("/", "\\/")}(?:$|\\?)`));
}

const scopedRoutes = ["/gelisim", "/egitim", "/kariyer", "/calisan-deneyimi", "/izinler"] as const;
const companyAnalyticsHeadings = [
  "Gelişim Planı Analitiği",
  "Eğitim & Gelişim Analitiği",
  "Kariyer & Readiness Özeti",
  "Çalışan Deneyimi Analitiği",
  "İzin Analitiği",
];

async function expectScopedWorkspace(page: Page) {
  const workspace = page.locator(".module-workspace");
  await expect(workspace).toBeVisible();
  const text = await workspace.innerText();
  for (const heading of companyAnalyticsHeadings) expect(text).not.toContain(heading);
  expect(text).not.toContain("Selin Acar");
  expect(text).not.toContain("Gökhan Duman");
  await expect(workspace.getByText(/Bu görünüm yalnızca rolünüzün veri kapsamındaki kayıtları gösterir/)).toBeVisible();
}

test.describe("FutureHR scoped analytics isolation", () => {
  test("employee self-service routes never render company-wide visual analytics", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "employee");
    for (const route of scopedRoutes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(?:$|\\?)`));
      await expectScopedWorkspace(page);
    }
  });

  test("manager routes stay in team scope instead of tenant-wide analytics", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "manager");
    for (const route of scopedRoutes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expectScopedWorkspace(page);
    }
  });

  test("company-scoped CEO role keeps executive analytics", async ({ page }) => {
    await openDemo(page);
    await page.goto("/gelisim");
    await expect(page.getByText("Gelişim Planı Analitiği", { exact: true })).toBeVisible();
  });
});
