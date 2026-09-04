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

test.describe("FutureHR V1 zero-training quality gate", () => {
  test("CEO demo opens with a simple task-oriented navigation", async ({ page }) => {
    await openDemo(page);
    await expect(page.getByRole("link", { name: "Ana Sayfa", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Performans & Yetenek", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gelişim & Kariyer", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ücret", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sistem Yönetimi", exact: true })).toBeVisible();
  });

  test("home page tells the user what to do before showing advanced analytics", async ({ page }) => {
    await openDemo(page);
    await expect(page.getByTestId("zero-training-dashboard")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bekleyen işler" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hızlı işlemler" })).toBeVisible();
    const advanced = page.getByRole("button", { name: /Detaylı şirket göstergeleri/ });
    await expect(advanced).toBeVisible();
    await expect(advanced).toHaveAttribute("aria-expanded", "false");
    await advanced.click();
    await expect(advanced).toHaveAttribute("aria-expanded", "true");
  });

  test("consolidated workspaces expose sibling modules in plain language", async ({ page }) => {
    await openDemo(page);
    await page.goto("/yetenek-matrisi");
    await expect(page.getByRole("heading", { name: "Bu alanın modülleri" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Değerlendirmeleri Karşılaştır/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Yetkinlikler/ }).first()).toBeVisible();
    await expect(page.locator('[data-workspace-module="/yetenek-matrisi"]')).toHaveAttribute("aria-current", "page");
    await page.goto("/gelisim");
    await expect(page.getByRole("link", { name: /^Eğitimler/ })).toBeVisible();
    await expect(page.locator('[data-workspace-module="/gelisim-analitigi"]')).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: /Şirket Kurulumu/ })).toBeVisible();
    await expect(page.locator('[data-workspace-module="/admin/guven-kvkk"]')).toBeVisible();
  });

  test("search finds nested tasks without requiring menu knowledge", async ({ page }) => {
    await openDemo(page);
    await page.keyboard.press("Control+K");
    const search = page.getByPlaceholder(/Ne yapmak istiyorsunuz/);
    await expect(search).toBeVisible();
    await search.fill("izin");
    await expect(page.getByText("İzinler", { exact: true }).first()).toBeVisible();
    await search.fill("kariyer");
    await expect(page.getByText("Kariyer Hazırlığı", { exact: true }).first()).toBeVisible();
    await search.fill("gizlilik");
    await expect(page.getByText("Gizlilik & KVKK", { exact: true }).first()).toBeVisible();
  });

  test("Türkiye setup status uses user language instead of developer jargon", async ({ page }) => {
    await openDemo(page);
    await page.goto("/turkiye-uyum");
    await expect(page.getByRole("heading", { name: "Türkiye Ayarları & Hazırlık" })).toBeVisible();
    await expect(page.getByText(/Kullanıma hazır|Kurulum gerekiyor/).first()).toBeVisible();
    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toContain("Credential bekliyor");
    expect(visibleText).not.toContain("Kodda aktif");
    expect(visibleText).not.toMatch(/\bKRİTİK\b/);
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
    await expect(page).toHaveURL(/\/kullanici/);
    await expect(page.getByTestId("personal-workspace")).toBeVisible();
    await expect(page.getByRole("link", { name: "Benim Alanım", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ücret", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Kritik Roller & Yedekler/ })).toHaveCount(0);
    await page.goto("/maas");
    await expect(page).not.toHaveURL(/\/maas$/);
  });

  test("current career role is informational and cannot be selected as target", async ({ page }) => {
    await openDemo(page);
    await page.goto("/kariyer");
    const currentRoleLabel = page.getByText("Mevcut rol", { exact: true });
    await expect(currentRoleLabel).toHaveCount(1);
    const currentRoleCard = currentRoleLabel.locator("..");
    const currentRoleTitle = (await currentRoleCard.locator("p").nth(1).textContent())?.trim() || "";
    expect(currentRoleTitle).not.toBe("");

    const targetSelect = page.getByLabel("Hedef rol");
    await expect(targetSelect).toHaveCount(1);
    const targetOptions = (await targetSelect.locator("option").allTextContents()).map((value) => value.trim());
    expect(targetOptions).not.toContain(currentRoleTitle);

    const currentRoleButton = page.getByRole("button", { name: new RegExp(currentRoleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
    if (await currentRoleButton.count()) await expect(currentRoleButton.first()).toBeDisabled();
  });

  test("manager performance workspace exposes active cycle governance", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "manager");
    await page.goto("/degerlendirme");
    await expect(page.getByText(/Performans Dönemi/).first()).toBeVisible();
    await expect(page.getByText(/Değerlendirme Açık|Hedef Planlama|Kalibrasyon|Dönem Kilitli/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Değerlendirmeleri Karşılaştır/ }).first()).toBeVisible();
  });

  test("locked performance cycle is visible and closes new scoring", async ({ page }) => {
    await openDemo(page);
    await page.evaluate(() => {
      const now = new Date();
      localStorage.setItem("hr_performance_cycles", JSON.stringify([{ id:"e2e-lock", name:"2026 H2 E2E Dönemi", year:2026, period:"H2", stage:"LOCKED", startDate:"2026-07-01", evaluationDeadline:"2026-12-15", calibrationDeadline:"2026-12-23", createdAt:now.toISOString(), lockedAt:now.toISOString() }]));
    });
    await page.goto("/degerlendirme");
    await expect(page.getByText("Dönem Kilitli", { exact: true })).toBeVisible();
    await expect(page.getByText(/Yeni puanlama yerine bir sonraki performans dönemi açılmalıdır/i)).toBeVisible();
  });

  test("development effectiveness analytics loads with measured evidence", async ({ page }) => {
    await openDemo(page);
    await page.goto("/gelisim-analitigi");
    await expect(page.getByRole("heading", { name: "Gelişim Etkinliği Analitiği" })).toBeVisible();
    await expect(page.getByText("Transfer Kanıtı", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Yönetici doğrulaması", { exact: true }).first()).toBeVisible();
  });

  test("setup wizard is CEO/HR-only and keeps first setup to four clear steps", async ({ page }) => {
    await openDemo(page);
    await page.goto("/kurulum");
    await expect(page.getByRole("heading", { name: "FutureHR'ı kullanıma hazırlayın" })).toBeVisible();
    await expect(page.getByRole("button", { name: /1\. Şirket bilgileri/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /4\. Yetkiler & gizlilik/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /5\./ })).toHaveCount(0);
    await switchPersona(page, "employee");
    await page.goto("/kurulum");
    await expect(page).not.toHaveURL(/\/kurulum$/);
  });

  test("command palette hides restricted compensation pages from employee", async ({ page }) => {
    await openDemo(page);
    await switchPersona(page, "employee");
    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder(/Ne yapmak istiyorsunuz/)).toBeVisible();
    await expect(page.getByText("Ücret Yönetimi", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Ücret Adaleti", { exact: true })).toHaveCount(0);
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
    expect(stored.find((item: { id?: number; read?: boolean }) => item.id === 987654)?.read).toBe(true);
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
        navBottom:(nav as HTMLElement).getBoundingClientRect().bottom,
        navClientHeight:(nav as HTMLElement).clientHeight,
        navScrollHeight:(nav as HTMLElement).scrollHeight,
        footerTop:footer.getBoundingClientRect().top,
        sidebarBottom:(document.querySelector('[data-testid="app-sidebar"]') as HTMLElement)?.getBoundingClientRect().bottom,
        fontSize:parseFloat(getComputedStyle(first).fontSize),
        rowHeight:first.getBoundingClientRect().height,
      };
    });
    expect(result).not.toBeNull();
    expect(result!.navBottom).toBeLessThanOrEqual(result!.footerTop + 1);
    expect(result!.navScrollHeight).toBeGreaterThanOrEqual(result!.navClientHeight);
    expect(result!.footerTop).toBeLessThanOrEqual(result!.sidebarBottom + 1);
    expect(result!.fontSize).toBeGreaterThanOrEqual(12);
    expect(result!.rowHeight).toBeGreaterThanOrEqual(32);
  });

  test("mobile shell has no horizontal overflow and menu opens and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDemo(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const openToggle=page.getByRole("button", { name: "Menüyü aç" });
    await openToggle.click();
    const closeToggle=page.getByRole("button", { name: "Menüyü kapat" }).first();
    await expect(closeToggle).toHaveAttribute("aria-expanded","true");
    await expect(page.getByTestId("app-sidebar")).toHaveCSS("transform", "none");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button",{name:"Menüyü aç"})).toHaveAttribute("aria-expanded","false");
  });

  test("FutureHR Intelligence opens as explainable decision support", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "FutureHR Intelligence'ı aç" }).click();
    await expect(page.getByRole("heading", { name: "FutureHR Intelligence" })).toBeVisible();
    await expect(page.getByLabel("FutureHR Intelligence sorusu")).toBeVisible();
    await expect(page.getByText(/Uygulamadaki kanıtları tarar/)).toBeVisible();
  });
});
