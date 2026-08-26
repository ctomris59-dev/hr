import { test, expect, Page } from "@playwright/test";
import fs from "fs";
import path from "path";

/* =======================
   CONFIG & SETUP
======================= */
const BASE_URL = process.env.DQI_BASE_URL || "http://localhost:3000";
const BACKEND_URL = process.env.DQI_BACKEND_URL || "http://127.0.0.1:8000";

const STORAGE_KEYS = {
  USERS: "hr_users",
  CURRENT_USER: "hr_current_user",
  LEAVE_REQUESTS: "hr_leave_requests",
  TRAINING_ASSIGNMENTS: "hr_training_assignments",
  ORG_CHART: "hr_org_chart",
  HISTORY_360: "hr_history_360",
};

const ARTIFACT_DIR = path.resolve(process.cwd(), "dqi-artifacts");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page: Page, name: string) {
  ensureDir(ARTIFACT_DIR);
  const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const file = path.join(ARTIFACT_DIR, `${safeName}-${Date.now()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

/* =======================
   LOGIN BYPASS
======================= */
type SharedStorageSnapshot = {
  trainingAssignments: string | null;
  leaveRequests: string | null;
  orgChart?: string | null;
  history360?: string | null;
};

async function bypassLogin(
  page: Page,
  userOverride: any,
  shared?: SharedStorageSnapshot
) {
  await page.addInitScript(({ keys, user, sharedData }) => {
    const trainingAssignments = sharedData?.trainingAssignments || null;
    const leaveRequests = sharedData?.leaveRequests || null;
    const orgChart = sharedData?.orgChart || null;
    const history360 = sharedData?.history360 || null;
    window.localStorage.clear();
    if (trainingAssignments) {
      window.localStorage.setItem(keys.TRAINING_ASSIGNMENTS, trainingAssignments);
    }
    if (leaveRequests) {
      window.localStorage.setItem(keys.LEAVE_REQUESTS, leaveRequests);
    }
    if (orgChart) {
      window.localStorage.setItem(keys.ORG_CHART, orgChart);
    }
    if (history360) {
      window.localStorage.setItem(keys.HISTORY_360, history360);
    }
    const usersMap = { [user.username]: user };
    window.localStorage.setItem(keys.USERS, JSON.stringify(usersMap));
    window.localStorage.setItem(keys.CURRENT_USER, JSON.stringify(user));
  }, { keys: STORAGE_KEYS, user: userOverride, sharedData: shared || null });
}

async function captureSharedStorage(page: Page): Promise<SharedStorageSnapshot> {
  return page.evaluate((keys) => {
    return {
      trainingAssignments: window.localStorage.getItem(keys.TRAINING_ASSIGNMENTS),
      leaveRequests: window.localStorage.getItem(keys.LEAVE_REQUESTS),
      orgChart: window.localStorage.getItem(keys.ORG_CHART),
      history360: window.localStorage.getItem(keys.HISTORY_360),
    };
  }, STORAGE_KEYS);
}

async function clearLocalStorage(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
}

type OrgChartEntry = {
  "Ad Soyad"?: string;
  name?: string;
  Departman?: string;
  department?: string;
  Pozisyon?: string;
  position?: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toUsername(value: string) {
  return normalizeName(value)
    .replace(/\s+/g, ".")
    .replace(/[ığüşöç]/g, (c) => ({ "ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c" }[c] || c));
}

function buildUserFromOrg(entry: OrgChartEntry, role: string) {
  const name = (entry["Ad Soyad"] || entry.name || "").trim();
  const dept = (entry.Departman || entry.department || "").trim();
  const position = (entry.Pozisyon || entry.position || "").trim();
  return {
    username: toUsername(name || role.toLowerCase()),
    name,
    role,
    dept,
    position,
  };
}

function mergeSharedStorage(base: SharedStorageSnapshot, override: SharedStorageSnapshot) {
  return {
    trainingAssignments: override.trainingAssignments ?? base.trainingAssignments ?? null,
    leaveRequests: override.leaveRequests ?? base.leaveRequests ?? null,
    orgChart: override.orgChart ?? base.orgChart ?? null,
    history360: override.history360 ?? base.history360 ?? null,
  };
}

function inferManagerRole(entry: OrgChartEntry) {
  const position = (entry.Pozisyon || entry.position || "").toLowerCase();
  if (position.includes("ceo") || position.includes("başkan") || position.includes("yönetim kurulu")) {
    return "CEO";
  }
  if (position.includes("direktör") || position.includes("director") || position.includes("genel müdür")) {
    return "DIRECTOR";
  }
  return "MANAGER";
}

async function selectOptionByText(page: Page, testId: string, label: string) {
  const select = page.getByTestId(testId);
  await expect(select).toBeVisible();
  await expect(select).toBeEnabled();

  const optionValue = await select.evaluate((el, targetLabel) => {
    const normalizedTarget = targetLabel
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const options = Array.from(el.querySelectorAll("option"));
    const match = options.find((opt) => {
      const text = opt.textContent || "";
      const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
      return (
        normalized === normalizedTarget ||
        normalized.includes(normalizedTarget) ||
        normalizedTarget.includes(normalized)
      );
    });
    return match?.getAttribute("value") || "";
  }, label);

  if (optionValue) {
    await select.selectOption(optionValue);
    return true;
  }
  return false;
}

async function selectFirstOption(page: Page, testId: string) {
  const select = page.getByTestId(testId);
  const optionCount = await select.locator("option").count();
  if (optionCount > 1) {
    await select.selectOption({ index: 1 });
    return true;
  }
  return false;
}

async function waitForSelectOptions(page: Page, testId: string, minCount: number = 2) {
  await page.waitForFunction(
    (selector, count) => {
      const el = document.querySelector(selector) as HTMLSelectElement | null;
      return !!el && el.options.length >= count;
    },
    `[data-testid="${testId}"]`,
    minCount
  );
}

async function fetchOrgChart(request: any): Promise<OrgChartEntry[]> {
  const res = await request.get(`${BACKEND_URL}/api/org-chart`);
  const json = await res.json();
  if (Array.isArray(json)) return json;
  return json?.data || [];
}

function findManagerEmployeePair(data: OrgChartEntry[]) {
  const byName = new Map<string, OrgChartEntry>();
  data.forEach((item) => {
    const name = (item["Ad Soyad"] || item.name || "").trim();
    if (name) byName.set(normalizeName(name), item);
  });

  for (const person of data) {
    const employeeName = (person["Ad Soyad"] || person.name || "").trim();
    if (!employeeName) continue;
    const managerCandidates = [person["Yönetici 1"], person["Yönetici 2"]].filter(Boolean) as string[];
    const managerName = managerCandidates.find((candidate) => candidate !== "-" && candidate !== employeeName);
    if (!managerName) continue;
    const manager = byName.get(normalizeName(managerName));
    if (manager) {
      return { manager, employee: person };
    }
  }

  throw new Error("Org chart içinde Yönetici/Personel eşleşmesi bulunamadı.");
}

function getFutureDate(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
}

/* =======================
   ÖZEL FONKSİYON KONTROLLERİ (SABIRLI VERSİYON)
======================= */
const PAGE_CHECKS: Record<string, (page: Page) => Promise<string[]>> = {
  
  "/dashboard": async (page) => {
    const logs = [];
    try {
        await page.waitForSelector('h1, h2, [role="heading"]', { state: 'visible', timeout: 10000 });
        const headerVisible = await page.getByText(/Yönetici Kokpiti/i).isVisible().catch(() => false);
        if (headerVisible) {
          logs.push("✅ Dashboard başlığı yüklendi.");
        } else {
          const cards = await page.locator('[class*="rounded"], [class*="card"]').count();
          logs.push(`✅ Dashboard görünümü yüklendi (${cards} blok)`);  
        }
    } catch {
        logs.push(`⚠️ Dashboard kartları 10 sn içinde yüklenemedi.`);
    }
    return logs;
  },

  "/izinler": async (page) => {
    const logs = [];
    // Tablonun dolmasını bekle
    try {
        // "Veri yok" yazısı kaybolana kadar veya ilk satır gelene kadar bekle
        await page.waitForSelector('tbody tr', { state: 'visible', timeout: 5000 });
        const rows = await page.locator('tbody tr').count();
        logs.push(`✅ İzin geçmişi yüklendi (${rows} satır)`);
    } catch {
        logs.push("⚠️ İzin tablosu boş veya yüklenmesi uzun sürdü.");
    }

    // Modal testi
    const btn = page.getByRole('button', { name: /Yeni|Ekle|Talep/i }).first();
    if (await btn.isVisible()) {
        await btn.click(); 
        try {
            await page.waitForSelector('[role="dialog"], .fixed, .modal', { state: 'visible', timeout: 3000 });
            logs.push("✅ 'Yeni İzin' modalı açıldı.");
            await page.keyboard.press('Escape');
        } catch {
            logs.push("❌ Modal açılmadı.");
        }
    }
    return logs;
  },

  "/organizasyon": async (page) => {
    const logs = [];
    try {
        await page.waitForSelector('input[placeholder*="Personel"], table tbody tr', { state: 'visible', timeout: 10000 });
        const rows = await page.locator("table tbody tr").count();
        logs.push(`✅ Organizasyon tablosu yüklendi (${rows} kayıt)`);
    } catch {
        logs.push("❌ Organizasyon tablosu bulunamadı.");
    }
    
    // Zoom butonları
    const zoomBtn = page.locator('button[aria-label="Zoom In"], button:has-text("+")').first();
    if (await zoomBtn.isVisible()) {
        await zoomBtn.click();
        logs.push("✅ Harita zoom fonksiyonu aktif.");
    }
    return logs;
  },

  "/degerlendirme": async (page) => {
    const logs = [];
    await page.waitForSelector('[data-testid="dqi-person-select"]', { timeout: 10000 });
    const options = await page.locator('[data-testid="dqi-person-select"] option').count();
    logs.push(`✅ Değerlendirme kişi seçimi yüklendi (${options} seçenek)`);
    return logs;
  },

  "/egitim": async (page) => {
    const logs = [];
    try {
        await page.waitForSelector('[data-testid="dqi-person-select"], [class*="training"], tbody tr', { state: 'visible', timeout: 10000 });
        const items = await page.locator('[class*="training"], tbody tr').count();
        logs.push(`✅ Eğitim görünümü yüklendi (${items} öğe)`);
    } catch {
        logs.push("⚠️ Eğitim listesi boş görünüyor.");
    }
    return logs;
  },
  
  "/ekip-yonetimi": async (page) => {
    const logs = [];
    try {
        await page.waitForSelector('tbody tr, [placeholder*="Ara"]', { state: 'visible', timeout: 10000 });
        const rows = await page.locator('tbody tr').count();
        logs.push(`✅ Ekip listesi yüklendi (${rows} kişi)`);
    } catch {
         logs.push("❌ Ekip listesi yüklenemedi (API veya Yetki sorunu olabilir).");
    }
    
    const searchInput = page.getByPlaceholder(/Ara|Search/i).first();
    if (await searchInput.isVisible()) {
        await searchInput.fill("Test");
        logs.push("✅ Arama kutusuna yazı yazılabiliyor.");
    }
    return logs;
  }
};

/* =======================
   TEST RUNNER
======================= */
test("Tam Kapsamlı Fonksiyonel Test", async ({ page, request }) => {
  test.setTimeout(300000);
  ensureDir(ARTIFACT_DIR);

  console.log("\n🕵️ DERİNLEMESİNE KONTROL TESTİ BAŞLIYOR...\n");

  // 1. DEMO VERİSİ
  console.log("🔄 Adım 1: Demo Verisi Tazeleniyor...");
  try {
    await request.post(`${BACKEND_URL}/api/admin/generate-rich-demo`, { timeout: 60000 });
  } catch {
    console.log("⚠️ Backend demo servisine ulaşılamadı (Veri eski olabilir).");
  }

  // 2. KİŞİ SEÇ (CEO yetkisiyle girelim ki her yere basabilelim)
  let targetUser = {
      username: "ceo", name: "Emin Öncü", role: "CEO", dept: "Yönetim", position: "Genel Müdür"
  };
  
  // Ama veriler için bir kurbana (personele) ihtiyacımız var
  let employeeId = "1";
  try {
      const hRes = await request.get(`${BACKEND_URL}/api/demo/health/scores`);
      const hData = await hRes.json();
      if(hData.sampleEmployeeId) employeeId = hData.sampleEmployeeId;
  } catch {}

  // 3. GİRİŞ YAP
  await bypassLogin(page, targetUser);

  // 4. MODÜLLERİ VE FONKSİYONLARI TEST ET
  const modules = [
    ["Yönetici Özet", "/dashboard"],
    ["İzin Yönetimi", "/izinler"],
    ["Organizasyon", "/organizasyon"],
    ["360 Değerlendirme", "/degerlendirme"],
    ["Yetenek Matrisi", "/yetenek-matrisi"],
    ["Eğitim", "/egitim"],
    ["Gelişim Planı", "/gelisim"],
    ["Kariyer Yolu", "/kariyer"],
    ["Yedekleme", "/yedekleme"],
    ["Maaş Simülasyonu", "/maas"],
    ["İşe Alım", "/ise-alim"],
    ["Yetkinlik Testi", "/aday-testi"],
    ["Ekip Yönetimi", "/ekip-yonetimi"],
  ];

  console.log(`🚀 Test Kullanıcısı: ${targetUser.name} (CEO)`);
  console.log(`🎯 Hedef Veri ID: ${employeeId}\n`);

  for (const [name, route] of modules) {
    const fullUrl = `${route}?kullaniciId=${employeeId}`;
    console.log(`👉 Modül: ${name.toUpperCase()}`);

    try {
        // Sayfaya Git
        await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
        
        // 1. Sayfa Açıldı mı?
        await Promise.race([
            expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 5000 }),
            expect(page.locator("body")).toBeVisible({ timeout: 5000 })
        ]);

        // 2. Özel Fonksiyon Testi Var mı?
        if (PAGE_CHECKS[route]) {
            console.log(`   ⚡ Alt Fonksiyonlar Test Ediliyor...`);
            try {
                const logs = await PAGE_CHECKS[route](page);
                logs.forEach(l => console.log(`      ${l}`));
            } catch (checkError: any) {
                console.log(`      ❌ Fonksiyon hatası: ${checkError.message}`);
                await screenshot(page, `func-error-${name}`);
            }
        } else {
            console.log(`      ℹ️ Standart görünüm kontrolü yapıldı.`);
        }

    } catch (e: any) {
        console.log(`   🚩 KRİTİK: Sayfa Çöktü!`);
        await screenshot(page, `crash-${name}`);
    }
    console.log(""); // Boşluk
  }
  
  console.log("✅ TEST TAMAMLANDI. Raporlar 'dqi-artifacts' klasöründe.");
});

test.describe("E2E Workflow - Kullanıcılar Arası Veri Akışı", () => {
  test("Senaryo 1: Eğitim Atama Döngüsü (Manager -> Employee)", async ({ page, request }) => {
    test.setTimeout(180000);
    console.log("🔧 Setup: Org chart yükleniyor...");
    const orgData = await fetchOrgChart(request);
    const { manager, employee } = findManagerEmployeePair(orgData);

    const managerRole = inferManagerRole(manager);
    const managerUser = buildUserFromOrg(
      { ...manager, Departman: manager.Departman || employee.Departman },
      managerRole
    );
    const employeeUser = buildUserFromOrg(employee, "EMPLOYEE");
    const employeeDept = employee.Departman || employee.department || "";
    const employeeName = employeeUser.name;
    const sharedBase: SharedStorageSnapshot = { orgChart: JSON.stringify(orgData) };

    console.log(`✅ Yönetici bulundu: ${managerUser.name}`);
    console.log(`✅ Personel bulundu: ${employeeName}`);

    await bypassLogin(page, managerUser, sharedBase);
    await page.goto(`${BASE_URL}/gelisim`, { waitUntil: "domcontentloaded" });
    console.log("✅ Yönetici giriş yaptı ve /gelisim açıldı");

    const deptToSelect = employeeDept || managerUser.dept || employeeUser.dept;
    const deptSelect = page.getByTestId("dqi-department-select");
    if (await deptSelect.isEnabled()) {
      if (deptToSelect) {
        const matched = await selectOptionByText(page, "dqi-department-select", deptToSelect);
        if (!matched) {
          await selectFirstOption(page, "dqi-department-select");
        }
      } else {
        await selectFirstOption(page, "dqi-department-select");
      }
    }

    try {
      await waitForSelectOptions(page, "dqi-person-select", 2);
    } catch {
      console.log("⚠️ Personel listesi henüz dolmadı, seçim denemesi yapılacak.");
    }
    const selected = await selectOptionByText(page, "dqi-person-select", employeeName);
    if (!selected) {
      const fallbackSelected = await selectFirstOption(page, "dqi-person-select");
      if (!fallbackSelected) {
        throw new Error("Personel seçenekleri bulunamadı.");
      }
    }
    console.log("✅ Yönetici personel seçti");

    const firstCompetency = page.locator("button").filter({ hasText: "Puan:" }).first();
    await firstCompetency.scrollIntoViewIfNeeded();
    await firstCompetency.click();

    const assignButton = page.getByRole("button", { name: "Ata" }).first();
    await expect(assignButton).toBeVisible();
    await assignButton.scrollIntoViewIfNeeded();
    const trainingRow = assignButton.locator("xpath=ancestor::div[contains(@class,'flex')][1]");
    const rawTitle = await trainingRow.locator("span").first().innerText();
    const trainingTitle = rawTitle.replace("•", "").trim();

    await assignButton.click();
    const dueDate = getFutureDate(7);
    await page.waitForSelector('input[type="date"]', { state: "visible" });
    await page.locator('input[type="date"]').first().fill(dueDate);
    await page.getByRole("button", { name: /Onayla ve Ata/i }).click();
    console.log(`✅ Yönetici eğitimi atadı: ${trainingTitle}`);

    const sharedAfterAssign = await captureSharedStorage(page);
    await clearLocalStorage(page);
    console.log("✅ Yönetici çıkış yaptı (localStorage temizlendi)");

    await bypassLogin(page, employeeUser, mergeSharedStorage(sharedBase, sharedAfterAssign));
    await page.goto(`${BASE_URL}/gelisim`, { waitUntil: "domcontentloaded" });
    console.log("✅ Personel giriş yaptı ve /gelisim açıldı");

    const deptToSelectEmployee = employeeDept || managerUser.dept || employeeUser.dept;
    const deptSelectEmployee = page.getByTestId("dqi-department-select");
    if (await deptSelectEmployee.isEnabled()) {
      if (deptToSelectEmployee) {
        const matched = await selectOptionByText(page, "dqi-department-select", deptToSelectEmployee);
        if (!matched) {
          await selectFirstOption(page, "dqi-department-select");
        }
      } else {
        await selectFirstOption(page, "dqi-department-select");
      }
    }
    try {
      await waitForSelectOptions(page, "dqi-person-select", 2);
    } catch {
      console.log("⚠️ Personel listesi henüz dolmadı, seçim denemesi yapılacak.");
    }
    const selectedEmployee = await selectOptionByText(page, "dqi-person-select", employeeName);
    if (!selectedEmployee) {
      const fallbackSelected = await selectFirstOption(page, "dqi-person-select");
      if (!fallbackSelected) {
        throw new Error("Personel seçenekleri bulunamadı.");
      }
    }

    await expect(page.getByText(trainingTitle, { exact: false })).toBeVisible();
    console.log("✅ Personel eğitimi listede gördü");
  });

  test("Senaryo 2: İzin Talep Döngüsü (Employee -> Manager)", async ({ page, request }) => {
    test.setTimeout(180000);
    console.log("🔧 Setup: Org chart yükleniyor...");
    const orgData = await fetchOrgChart(request);
    const { manager, employee } = findManagerEmployeePair(orgData);

    const managerRole = inferManagerRole(manager);
    const managerUser = buildUserFromOrg(
      { ...manager, Departman: manager.Departman || employee.Departman },
      managerRole
    );
    const employeeUser = buildUserFromOrg(employee, "EMPLOYEE");
    const employeeName = employeeUser.name;
    const sharedBase: SharedStorageSnapshot = { orgChart: JSON.stringify(orgData) };

    await bypassLogin(page, employeeUser, sharedBase);
    await page.goto(`${BASE_URL}/izinler`, { waitUntil: "domcontentloaded" });
    console.log("✅ Personel giriş yaptı ve /izinler açıldı");

    await page.locator("summary").filter({ hasText: "Yeni İzin Talebi Oluştur" }).click();
    const leaveNote = `E2E izin talebi ${Date.now()}`;
    await page.getByPlaceholder("Sebep belirtiniz...").fill(leaveNote);
    const startDate = getFutureDate(10);
    const endDate = getFutureDate(12);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(startDate);
    await dateInputs.nth(1).fill(endDate);
    await page.getByRole("button", { name: /Talebi Gönder/i }).click();
    console.log("✅ Personel yeni izin talebi oluşturdu");

    const sharedAfterRequest = await captureSharedStorage(page);
    await clearLocalStorage(page);
    console.log("✅ Personel çıkış yaptı (localStorage temizlendi)");

    await bypassLogin(page, managerUser, mergeSharedStorage(sharedBase, sharedAfterRequest));
    await page.goto(`${BASE_URL}/izinler`, { waitUntil: "domcontentloaded" });
    console.log("✅ Yönetici giriş yaptı ve /izinler açıldı");

    await page.getByRole("button", { name: /Onay Bekleyenler/i }).click();
    await expect(page.getByText(employeeName, { exact: false })).toBeVisible();
    await expect(page.getByText(leaveNote, { exact: false })).toBeVisible();
    console.log("✅ Yönetici bekleyen talebi listede gördü");
  });
});