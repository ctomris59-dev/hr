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

async function visibleInteractionViolations(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const buttons = Array.from(document.querySelectorAll("button,summary")).filter(visible).filter((element) => {
      const text = (element.textContent || "").trim();
      const label = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("title");
      return !text && !label;
    }).map((element) => ({ tag: element.tagName, html: (element as HTMLElement).outerHTML.slice(0, 180) }));
    const deadLinks = Array.from(document.querySelectorAll("a[href]")).filter(visible).filter((element) => {
      const href = element.getAttribute("href")?.trim();
      return !href || href === "#" || href.toLowerCase().startsWith("javascript:");
    }).map((element) => ({ href: element.getAttribute("href"), text: (element.textContent || "").trim().slice(0, 80) }));
    return { buttons, deadLinks };
  });
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
    await expect(page.locator('[data-workspace-module="/yetenek-matrisi"]')).toHaveAttribute("aria-current", "page");
    await page.goto("/gelisim");
    await expect(page.getByRole("link", { name: /Eğitim & Müdahaleler/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gelişim Etkinliği/ })).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: /Şirket Kurulumu/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Güven & KVKK/ })).toBeVisible();
  });

  test("decision priority row opens explainable demo profile and Escape closes it", async ({ page }) => {
    await openDemo(page);
    await page.goto("/karar-merkezi");
    const row = page.getByTestId("decision-priority-row").first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Explainable AI · Kanıt Zinciri", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
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

  test("current career role is informational, not a clickable target", async ({ page }) => {
    await openDemo(page);
    await page.goto("/kariyer");
    const current = page.locator('button[aria-current="true"]').first();
    await expect(current).toBeVisible();
    await expect(current).toBeDisabled();
    await expect(current).toContainText("Mevcut");
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

  test("mark-all-read keeps notification history instead of deleting it", async ({ page }) => {
    await openDemo(page);
    await page.evaluate(() => {
      localStorage.setItem("hr_notifications", JSON.stringify([{id:987654,message:"UX geçmiş testi",type:"info",read:false,timestamp:new Date().toISOString()}]));
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    });
    await page.getByRole("button", { name: "Bildirimler" }).click();
    await expect(page.getByText("UX geçmiş testi", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Tümünü okundu say" }).click();
    await expect(page.getByText("UX geçmiş testi", { exact: true })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("hr_notifications") || "[]"));
    expect(stored.find((item:any)=>item.id===987654)?.read).toBe(true);
  });

  test("representative product routes expose no dead links or unlabeled icon buttons", async ({ page }) => {
    await openDemo(page);
    const routes=["/dashboard","/karar-merkezi","/organizasyon","/degerlendirme","/yetenek-matrisi","/gelisim","/maas","/ise-alim","/ekip-yonetimi"];
    for(const route of routes){
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      const violations=await visibleInteractionViolations(page);
      expect(violations.deadLinks,`${route} dead links`).toEqual([]);
      expect(violations.buttons,`${route} unlabeled controls`).toEqual([]);
    }
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

  test("mobile shell has no horizontal overflow and menu opens and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDemo(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const toggle=page.getByRole("button", { name: "Menüyü aç" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded","true");
    await expect(page.getByTestId("app-sidebar")).toHaveCSS("transform", "none");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button",{name:"Menüyü aç"})).toHaveAttribute("aria-expanded","false");
  });

  test("Copilot opens as explainable decision support", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "FutureHR Copilot'u aç" }).click();
    await expect(page.getByRole("heading", { name: "FutureHR Copilot" })).toBeVisible();
    await expect(page.getByPlaceholder(/Pelin Yılmaz için neden/)).toBeVisible();
    await expect(page.getByText(/Kanıtı birleştirir; kararı insana bırakır/)).toBeVisible();
  });
});
