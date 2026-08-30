import { expect, test, type Page } from "@playwright/test";

const DEFAULT_ROUTE_BY_ROLE = {
  ceo: "/dashboard",
  hr_admin: "/dashboard",
  manager: "/dashboard",
  employee: "/kariyer",
} as const;

async function openDemo(page: Page) {
  // Product onboarding is intentionally excluded from business-flow E2E tests.
  // addInitScript survives reloads/navigation and prevents the welcome modal from
  // intercepting unrelated controls without changing real-user onboarding behavior.
  await page.addInitScript(() => {
    window.localStorage.setItem("fhr_demo_tour_seen_v1", "1");
  });
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
  await expect(select).toHaveValue(role);
}

test.describe("FutureHR V1 demo quality gate", () => {
  test("CEO demo opens with core decision modules", async ({ page }) => {
    await openDemo(page);
    await expect(page.getByText("Yönetici Özeti", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Ücret Karar Merkezi/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Halefiyet & Yedekleme/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kurulum/ })).toBeVisible();
  });

  test("employee persona only sees self-service scope", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "employee");
    await expect(page).toHaveURL(/\/kariyer/);
    await expect(page.getByRole("link", { name: /Kariyer Yolu/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ücret Karar Merkezi/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Halefiyet & Yedekleme/ })).toHaveCount(0);
    await page.goto("/maas");
    await expect(page).not.toHaveURL(/\/maas$/);
  });

  test("manager performance workspace exposes active cycle governance", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "manager");
    await page.goto("/degerlendirme");
    await expect(page.getByText(/Performans Dönemi/).first()).toBeVisible();
    await expect(page.getByText(/Değerlendirme Açık|Hedef Planlama|Kalibrasyon|Dönem Kilitli/).first()).toBeVisible();
  });

  test("locked performance cycle is visible and closes new scoring", async ({ page }) => {
    await openDemo(page);
    await page.evaluate(() => {
      const now = new Date();
      localStorage.setItem("hr_performance_cycles", JSON.stringify([{ id:"e2e-lock", name:"2026 H2 E2E Dönemi", year:2026, period:"H2", stage:"LOCKED", startDate:"2026-07-01", evaluationDeadline:"2026-12-15", calibrationDeadline:"2026-12-23", createdAt:now.toISOString(), lockedAt:now.toISOString() }]));
    });
    await page.goto("/degerlendirme");
    await expect(page.getByText("Dönem Kilitli", { exact: true })).toBeVisible();
    await expect(page.getByText(/yeni puan girişi kapalı/i)).toBeVisible();
  });

  test("development effectiveness analytics loads with measured evidence", async ({ page }) => {
    await openDemo(page);
    await page.goto("/gelisim-analitigi");
    await expect(page.getByRole("heading", { name: "Yetkinlik Bazlı Gelişim Etkinliği" })).toBeVisible();
    await expect(page.getByText("Doğrulanmış transfer", { exact: true })).toBeVisible();
    await expect(page.getByText("Yeniden ölçülen", { exact: true })).toBeVisible();
  });

  test("onboarding wizard is CEO/HR-only", async ({ page }) => {
    await openDemo(page);
    await page.goto("/kurulum");
    await expect(page.getByRole("heading", { name: "FutureHR V1 Kurulum" })).toBeVisible();
    await switchPersona(page, "employee");
    await page.goto("/kurulum");
    await expect(page).not.toHaveURL(/\/kurulum$/);
  });

  test("command palette hides restricted salary route from employee", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "employee");
    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder(/Yetkiniz dahilindeki/)).toBeVisible();
    await expect(page.getByText("Ücret Karar Merkezi", { exact: true })).toHaveCount(0);
  });

  test("business notification event is actionable", async ({ page }) => {
    await openDemo(page);
    await page.evaluate(() => {
      const now = new Date();
      localStorage.setItem("hr_performance_cycles", JSON.stringify([{ id:"e2e-cal", name:"2026 H2 Kalibrasyon", year:2026, period:"H2", stage:"CALIBRATION", startDate:"2026-07-01", evaluationDeadline:"2026-12-15", calibrationDeadline:"2026-12-23", createdAt:now.toISOString() }]));
    });
    await page.reload();
    await page.getByRole("button", { name: "Bildirimler" }).click();
    await expect(page.getByText(/kalibrasyon aşamasında/i)).toBeVisible();
  });

  test("1366x768 sidebar fully fits above user footer", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await openDemo(page);
    const result = await page.evaluate(() => {
      const nav = document.querySelector(".futurehr-sidebar-nav");
      const footer = document.querySelector(".futurehr-sidebar-footer");
      const links = Array.from(nav?.querySelectorAll("a") || []);
      const last = links.at(-1);
      if (!nav || !footer || !last) return null;
      return { lastBottom:last.getBoundingClientRect().bottom, footerTop:footer.getBoundingClientRect().top, sidebarBottom:(document.querySelector('[data-testid="app-sidebar"]') as HTMLElement)?.getBoundingClientRect().bottom };
    });
    expect(result).not.toBeNull();
    expect(result!.lastBottom).toBeLessThanOrEqual(result!.footerTop + 1);
    expect(result!.footerTop).toBeLessThanOrEqual(result!.sidebarBottom + 1);
  });

  test("mobile shell has no horizontal overflow and menu opens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDemo(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Menüyü aç/kapat" }).click();
    await expect(page.getByTestId("app-sidebar")).toHaveCSS("transform", "none");
  });

  test("Copilot opens with explainable decision prompt", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "FutureHR AI Copilot'u aç" }).click();
    await expect(page.getByRole("heading", { name: "FutureHR AI Copilot" })).toBeVisible();
    await expect(page.getByPlaceholder(/Pelin Yılmaz için neden/)).toBeVisible();
  });
});
