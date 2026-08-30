import { expect, test, type Page } from "@playwright/test";

const DEFAULT_ROUTE_BY_ROLE = {
  ceo: "/dashboard",
  hr_admin: "/dashboard",
  manager: "/dashboard",
  employee: "/kariyer",
} as const;

async function openDemo(page: Page) {
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
  test("CEO demo opens with simplified decision workspaces", async ({ page }) => {
    await openDemo(page);
    await expect(page.getByText("Yönetici Özeti", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Performans", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Yetenek & Kariyer", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gelişim", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ücret & Bütçe", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Yönetim & Ayarlar", exact: true })).toBeVisible();
  });

  test("consolidated workspaces expose sibling modules prominently", async ({ page }) => {
    await openDemo(page);
    await page.goto("/yetenek-matrisi");
    await expect(page.getByRole("heading", { name: "Bu alanın modülleri" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kariyer & Readiness/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Halefiyet & Yedekleme/ })).toBeVisible();
    await page.goto("/gelisim");
    await expect(page.getByRole("link", { name: /Eğitim & Müdahaleler/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gelişim Etkinliği/ })).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: /Şirket Kurulumu/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Güven & KVKK/ })).toBeVisible();
  });

  test("Human Enterprise workspace navigation is readable, compact and gradient-free", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDemo(page);
    await page.goto("/gelisim");
    const metrics = await page.evaluate(() => {
      const nav = document.querySelector(".futurehr-family-nav") as HTMLElement | null;
      const heading = nav?.querySelector("h2") as HTMLElement | null;
      const card = nav?.querySelector(".futurehr-family-card") as HTMLElement | null;
      const description = card?.querySelector("p") as HTMLElement | null;
      const hero = document.querySelector(".module-hero") as HTMLElement | null;
      if (!nav || !heading || !card || !description || !hero) return null;
      return {
        headingSize: parseFloat(getComputedStyle(heading).fontSize),
        descriptionSize: parseFloat(getComputedStyle(description).fontSize),
        cardHeight: card.getBoundingClientRect().height,
        heroHeight: hero.getBoundingClientRect().height,
        cardBackgroundImage: getComputedStyle(card).backgroundImage,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.headingSize).toBeGreaterThanOrEqual(16);
    expect(metrics!.descriptionSize).toBeGreaterThanOrEqual(12);
    expect(metrics!.cardHeight).toBeGreaterThanOrEqual(96);
    expect(metrics!.cardHeight).toBeLessThanOrEqual(120);
    expect(metrics!.heroHeight).toBeLessThanOrEqual(84);
    expect(metrics!.cardBackgroundImage).toBe("none");
  });

  test("employee persona only sees self-service scope", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "employee");
    await expect(page).toHaveURL(/\/kariyer/);
    await expect(page.getByRole("link", { name: "Kariyerim", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ücret & Bütçe/ })).toHaveCount(0);
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
    await expect(page.getByRole("link", { name: /Kalibrasyon/ }).first()).toBeVisible();
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

  test("onboarding wizard is CEO/HR-only and lives under system workspace", async ({ page }) => {
    await openDemo(page);
    await page.goto("/kurulum");
    await expect(page.getByRole("heading", { name: "FutureHR V1 Kurulum" })).toBeVisible();
    await expect(page.getByText("Yönetim & Ayarlar çalışma alanı", { exact: true })).toBeVisible();
    await switchPersona(page, "employee");
    await page.goto("/kurulum");
    await expect(page).not.toHaveURL(/\/kurulum$/);
  });

  test("command palette hides restricted compensation workspace from employee", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "employee");
    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder(/Çalışma alanı veya personel ara/)).toBeVisible();
    await expect(page.getByText("Ücret & Bütçe", { exact: true })).toHaveCount(0);
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

  test("1366x768 sidebar fits and keeps professional readable typography", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await openDemo(page);
    const result = await page.evaluate(() => {
      const nav = document.querySelector(".futurehr-sidebar-nav");
      const footer = document.querySelector(".futurehr-sidebar-footer");
      const links = Array.from(nav?.querySelectorAll("a") || []);
      const last = links.at(-1);
      const first = links[0] as HTMLElement | undefined;
      if (!nav || !footer || !last || !first) return null;
      return {
        lastBottom:last.getBoundingClientRect().bottom,
        footerTop:footer.getBoundingClientRect().top,
        sidebarBottom:(document.querySelector('[data-testid="app-sidebar"]') as HTMLElement)?.getBoundingClientRect().bottom,
        fontSize:parseFloat(getComputedStyle(first).fontSize),
        rowHeight:first.getBoundingClientRect().height,
      };
    });
    expect(result).not.toBeNull();
    expect(result!.lastBottom).toBeLessThanOrEqual(result!.footerTop + 1);
    expect(result!.footerTop).toBeLessThanOrEqual(result!.sidebarBottom + 1);
    expect(result!.fontSize).toBeGreaterThanOrEqual(12);
    expect(result!.rowHeight).toBeGreaterThanOrEqual(32);
  });

  test("mobile shell has no horizontal overflow and menu opens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDemo(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Menüyü aç/kapat" }).click();
    await expect(page.getByTestId("app-sidebar")).toHaveCSS("transform", "none");
  });

  test("Copilot opens as explainable decision support", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "FutureHR Copilot'u aç" }).click();
    await expect(page.getByRole("heading", { name: "FutureHR Copilot" })).toBeVisible();
    await expect(page.getByPlaceholder(/Pelin Yılmaz için neden/)).toBeVisible();
    await expect(page.getByText(/Kanıtı birleştirir; kararı insana bırakır/)).toBeVisible();
  });
});