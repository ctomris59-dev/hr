import { expect, test, type Page } from "@playwright/test";

type Role = "CEO" | "IK" | "MANAGER" | "EMPLOYEE";

const USERS: Record<Role, Record<string, unknown>> = {
  CEO: { username:"ceo", name:"Pelin Yılmaz", role:"CEO", dept:"Genel Yönetim", department:"Genel Yönetim", position:"Genel Müdür", employee_id:"E-004", authMode:"demo" },
  IK: { username:"ik", name:"Selin Aras", role:"IK", dept:"İnsan Kaynakları", department:"İnsan Kaynakları", position:"İK Yöneticisi", employee_id:"E-005", authMode:"demo" },
  MANAGER: { username:"hakan", name:"Hakan Çetin", role:"MANAGER", dept:"Finans", department:"Finans", position:"Finans Müdürü", employee_id:"E-003", authMode:"demo" },
  EMPLOYEE: { username:"ayse", name:"Ayşe Kaya", role:"EMPLOYEE", dept:"Finans", department:"Finans", position:"Finans Uzmanı", employee_id:"E-001", authMode:"demo" },
};

async function seedGoldenFixture(page: Page, role: Role) {
  const user = USERS[role];
  await page.addInitScript(({ user }) => {
    const org = [
      { id:"E-001", employee_id:"E-001", "Personel Kodu":"E-001", "Ad Soyad":"Ayşe Kaya", Departman:"Finans", Pozisyon:"Finans Uzmanı", "Yönetici 1":"Hakan Çetin", "Yönetici 2":"Pelin Yılmaz", "İşe Giriş Tarihi":"2024-01-15", "Maaş (TL)":52000 },
      { id:"E-002", employee_id:"E-002", "Personel Kodu":"E-002", "Ad Soyad":"Cem Yılmaz", Departman:"Teknoloji", Pozisyon:"Yazılım Uzmanı", "Yönetici 1":"Pelin Yılmaz", "İşe Giriş Tarihi":"2023-06-01", "Maaş (TL)":88000 },
      { id:"E-003", employee_id:"E-003", "Personel Kodu":"E-003", "Ad Soyad":"Hakan Çetin", Departman:"Finans", Pozisyon:"Finans Müdürü", "Yönetici 1":"Pelin Yılmaz", "İşe Giriş Tarihi":"2021-04-10", "Maaş (TL)":96000 },
      { id:"E-004", employee_id:"E-004", "Personel Kodu":"E-004", "Ad Soyad":"Pelin Yılmaz", Departman:"Genel Yönetim", Pozisyon:"Genel Müdür", "İşe Giriş Tarihi":"2019-01-01", "Maaş (TL)":120000 },
      { id:"E-005", employee_id:"E-005", "Personel Kodu":"E-005", "Ad Soyad":"Selin Aras", Departman:"İnsan Kaynakları", Pozisyon:"İK Yöneticisi", "Yönetici 1":"Pelin Yılmaz", "İşe Giriş Tarihi":"2020-09-14", "Maaş (TL)":90000 },
    ];
    const history = [
      { id:"EV-001", Personel:"Ayşe Kaya", employee_id:"E-001", date:"2026-08-31", kpi_score:4.2, manager_performance_score:4.1, performance_score:4.15, evidence_score:82, ANA:3.8, DIG:4.1, COM:3.9 },
      { id:"EV-002", Personel:"Cem Yılmaz", employee_id:"E-002", date:"2026-08-31", kpi_score:3.6, manager_performance_score:3.5, performance_score:3.55, evidence_score:76, ANA:4.2, DIG:4.5, COM:3.4 },
    ];
    const candidates = [
      { id:"C-001", full_name:"Deniz Acar", name:"Deniz Acar", position:"Finans Analisti", status:"Teklif", test_sent:true, interview_done:true, reference_checked:false },
      { id:"C-002", full_name:"Mert Akın", name:"Mert Akın", position:"Yazılım Uzmanı", status:"Mülakat", test_sent:true, interview_done:true, reference_checked:true },
    ];
    const training = [
      { id:"T-001", employee:"Ayşe Kaya", employee_name:"Ayşe Kaya", trainingName:"İleri Excel ve Finansal Modelleme", status:"Tamamlandı" },
      { id:"T-002", employee:"Ayşe Kaya", employee_name:"Ayşe Kaya", trainingName:"Sunum ve İletişim", status:"Atandı" },
    ];
    const leave = [
      { id:"L-001", employee:"Ayşe Kaya", employee_name:"Ayşe Kaya", status:"Onaylandı", days:4 },
      { id:"L-002", employee:"Ayşe Kaya", employee_name:"Ayşe Kaya", status:"Bekliyor", days:2 },
    ];
    const benchmarks = [
      { id:"B-001", Departman:"Finans", Pozisyon:"Finans Uzmanı", "Piyasa Ortalaması":60000 },
      { id:"B-002", Departman:"Teknoloji", Pozisyon:"Yazılım Uzmanı", "Piyasa Ortalaması":92000 },
    ];
    localStorage.setItem("hr_current_user", JSON.stringify(user));
    localStorage.setItem("hr_org_chart", JSON.stringify(org));
    localStorage.setItem("hr_history_360", JSON.stringify(history));
    localStorage.setItem("hr_candidates", JSON.stringify(candidates));
    localStorage.setItem("hr_candidate_results", "[]");
    localStorage.setItem("hr_assessments", "[]");
    localStorage.setItem("hr_training_assignments", JSON.stringify(training));
    localStorage.setItem("hr_development_plans", "[]");
    localStorage.setItem("hr_career_profiles", "[]");
    localStorage.setItem("hr_market_benchmarks", JSON.stringify(benchmarks));
    localStorage.setItem("hr_compensation_cycles", "[]");
    localStorage.setItem("hr_pulse_answers", "[]");
    localStorage.setItem("hr_leave_requests", JSON.stringify(leave));
    localStorage.removeItem("hr_access_policy_v3");
    localStorage.removeItem("hr_data_cleared");
  }, { user });
}

async function openIntelligence(page: Page, role: Role, route?: string) {
  await seedGoldenFixture(page, role);
  const target = route || (role === "EMPLOYEE" ? "/kullanici" : "/dashboard");
  await page.goto(target, { waitUntil:"load" });
  await expect(page.getByTestId("app-shell")).toBeVisible();
  const trigger = page.getByRole("button", { name:"FutureHR Intelligence'ı aç" });
  await expect(trigger).toBeVisible();
  await trigger.click({ timeout:10_000 });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#futurehr-agent-question")).toBeVisible();
}

async function ask(page: Page, question: string, expected: RegExp) {
  const input = page.locator("#futurehr-agent-question");
  await input.fill(question);
  await page.getByRole("button", { name:"Soruyu gönder" }).click();
  await expect(page.getByText(question, { exact:true })).toBeVisible();
  await expect(page.getByText(expected).last()).toBeVisible({ timeout:30_000 });
  await expect(page.getByText(/Kanıt güveni:/).last()).toBeVisible({ timeout:30_000 });
}

function rulesAnalysis(answer: string, reason: string) {
  return {
    answer,
    executiveSummary: answer,
    confidence:"orta",
    confidenceReason:reason,
    recommendations:[],
    evidenceSources:[],
    nextActions:[],
    evidenceGaps:[],
    guardrail:"FutureHR karar desteği sunar; işe alma, işten çıkarma, terfi, ücret ve disiplin için nihai karar insandadır.",
  };
}

test.describe("FutureHR Intelligence golden-answer contract", () => {
  test("28 deterministic HR questions return exact authorized records without external AI", async ({ page }) => {
    test.setTimeout(240_000);
    await openIntelligence(page, "CEO");
    const agentRequests:string[] = [];
    page.on("request", request => {
      if (request.method() === "POST" && request.url().includes("/api/ai/agent")) agentRequests.push(request.postData() || "");
    });

    const cases:Array<[string, RegExp]> = [
      ["Ayşe Kaya'nın pozisyonu nedir?", /Ayşe Kaya'nın pozisyonu Finans Uzmanı; departmanı Finans/i],
      ["Ayşe Kaya hangi departmanda?", /departmanı Finans/i],
      ["Ayşe Kaya'nın görevi ne?", /pozisyonu Finans Uzmanı/i],
      ["Ayşe Kaya'nın yöneticisi kim?", /yönetici zinciri: Hakan Çetin · Pelin Yılmaz/i],
      ["Ayşe Kaya'nın amiri kim?", /Hakan Çetin/i],
      ["Ayşe Kaya'nın işe giriş tarihi nedir?", /2024-01-15/],
      ["Ayşe Kaya'nın maaşı nedir?", /52\.000 TL/],
      ["Ayşe Kaya mevcut maaşı ne kadar?", /52\.000 TL/],
      ["Cem Yılmaz'ın ücreti kaç?", /88\.000 TL/],
      ["En yüksek maaş kimde?", /Pelin Yılmaz — 120\.000 TL/i],
      ["Teklif aşamasındaki adaylar kim?", /Deniz Acar \(Teklif\)/i],
      ["Mülakat aşamasındaki adaylar kim?", /Mert Akın \(Mülakat\)/i],
      ["Deniz Acar hangi aşamada?", /Deniz Acar Teklif aşamasında/i],
      ["Deniz Acar referans kontrolü tamamlandı mı?", /referans tamamlanmadı/i],
      ["Ayşe Kaya hangi eğitimleri aldı?", /İleri Excel ve Finansal Modelleme \(Tamamlandı\)/i],
      ["Ayşe Kaya eğitim geçmişini söyle.", /Sunum ve İletişim \(Atandı\)/i],
      ["Ayşe Kaya'nın bekleyen izni kaç gün?", /4 gün onaylı izin kullanımı ve 2 gün bekleyen/i],
      ["Ayşe Kaya'nın onaylı izni kaç gün?", /4 gün onaylı izin kullanımı ve 2 gün bekleyen/i],
      ["Cem Yılmaz'ın pozisyonu nedir?", /Cem Yılmaz'ın pozisyonu Yazılım Uzmanı; departmanı Teknoloji/i],
      ["Cem Yılmaz'ın yöneticisi kim?", /Cem Yılmaz'ın yönetici zinciri: Pelin Yılmaz/i],
      ["Cem Yılmaz'ın işe giriş tarihi nedir?", /2023-06-01/],
      ["Hakan Çetin'in pozisyonu nedir?", /Hakan Çetin'in pozisyonu Finans Müdürü; departmanı Finans/i],
      ["Hakan Çetin'in yöneticisi kim?", /Hakan Çetin'in yönetici zinciri: Pelin Yılmaz/i],
      ["Hakan Çetin'in işe giriş tarihi nedir?", /2021-04-10/],
      ["Pelin Yılmaz'ın pozisyonu nedir?", /Pelin Yılmaz'ın pozisyonu Genel Müdür; departmanı Genel Yönetim/i],
      ["Selin Aras'ın pozisyonu nedir?", /Selin Aras'ın pozisyonu İK Yöneticisi; departmanı İnsan Kaynakları/i],
      ["Mert Akın hangi aşamada?", /Mert Akın Mülakat aşamasında/i],
      ["Mert Akın referans kontrolü tamamlandı mı?", /referans tamamlandı/i],
    ];

    expect(cases, "Golden contract must stay at exactly 28 deterministic questions").toHaveLength(28);
    for (const [question, expected] of cases) await ask(page, question, expected);
    expect(agentRequests, "Deterministic golden answers must remain local").toHaveLength(0);
  });

  test("external AI payload is fully privacy-safe, including fallback and manager relationships", async ({ page }) => {
    await openIntelligence(page, "CEO");
    const agentRequests:string[] = [];
    page.on("request", request => {
      if (request.method() === "POST" && request.url().includes("/api/ai/agent")) agentRequests.push(request.postData() || "");
    });
    await ask(page, "Ayşe Kaya için gelişim ve eğitim önceliklerini değerlendir.", /gelişim|eğitim|kanıt|performans/i);
    expect(agentRequests.length).toBeGreaterThan(0);
    const outbound = agentRequests.at(-1) || "";
    for (const secret of ["Ayşe Kaya", "Hakan Çetin", "Pelin Yılmaz", "Selin Aras", "Cem Yılmaz", "52000", "88000", "96000", "120000", "Maaş (TL)"]) {
      expect(outbound, `Outbound payload leaked ${secret}`).not.toContain(secret);
    }
    expect(outbound).toContain("seçili çalışan");
    expect(outbound).toContain("Çalışan-");
  });

  test("CEO salary scope is company-wide", async ({ page }) => {
    await openIntelligence(page, "CEO");
    await ask(page, "Cem Yılmaz'ın mevcut maaşı nedir?", /88\.000 TL/);
  });

  test("HR salary scope is company-wide", async ({ page }) => {
    await openIntelligence(page, "IK");
    await ask(page, "Ayşe Kaya'nın ücreti ne kadar?", /52\.000 TL/);
  });

  test("manager salary scope is denied by default even for a direct report", async ({ page }) => {
    await openIntelligence(page, "MANAGER");
    await ask(page, "Ayşe Kaya'nın maaşı nedir?", /mevcut rolünüzün erişim kapsamı dışında/i);
    await expect(page.locator("body")).not.toContainText("52.000 TL");
  });

  test("employee can read only their own salary", async ({ page }) => {
    await openIntelligence(page, "EMPLOYEE");
    await ask(page, "Ayşe Kaya mevcut maaşını söyle.", /52\.000 TL/);
    await ask(page, "Cem Yılmaz'ın maaşı nedir?", /mevcut yetki kapsamındaki FutureHR çalışan kayıtlarıyla eşleştirilemedi/i);
    await expect(page.locator("body")).not.toContainText("88.000 TL");
  });

  test("three high-impact questions remain human-in-the-loop", async ({ page }) => {
    test.setTimeout(90_000);
    await openIntelligence(page, "CEO");
    await page.route("**/api/ai/agent", async route => {
      const request = route.request();
      const body = request.postDataJSON() as { question?: string };
      await route.fulfill({
        status:200,
        contentType:"application/json",
        body:JSON.stringify({
          mode:"rules",
          provider:"rules",
          configured:true,
          model:"futurehr-agent-fallback",
          analysis:rulesAnalysis("Kanıtları ve riskleri inceleyin; bu yüksek etkili işlem için otomatik nihai karar verilmez.", `İnsan doğrulaması gerekli: ${body?.question || "HR kararı"}`),
          note:"Doğrulanmış FutureHR araç sonuçları kullanılıyor.",
        }),
      });
    });

    for (const question of [
      "Ayşe Kaya terfi ettirilmeli mi?",
      "Ayşe Kaya işten çıkarılmalı mı?",
      "Ayşe Kaya'ya yüzde 20 zam yapalım mı?",
    ]) {
      await ask(page, question, /otomatik nihai karar verilmez/i);
      await expect(page.getByRole("dialog", { name:"FutureHR Intelligence" }).getByText(/nihai karar insandadır/i).last()).toBeVisible();
    }
  });

  test("AI disabled mode returns verified local rules instead of an error", async ({ page }) => {
    await openIntelligence(page, "CEO");
    await page.route("**/api/ai/agent", route => route.fulfill({
      status:200,
      contentType:"application/json",
      body:JSON.stringify({
        mode:"rules", provider:"rules", configured:false, model:"futurehr-agent-rules",
        analysis:rulesAnalysis("AI kapalı; doğrulanmış FutureHR yerel kanıtları kullanıldı.", "AI sağlayıcısı yapılandırılmadı."),
        note:"AI sağlayıcısı yapılandırılmadığı için yerel FutureHR araç sonuçları kullanılıyor.",
      }),
    }));
    await ask(page, "Bu hafta hangi insan kararlarına odaklanmalıyım?", /AI kapalı; doğrulanmış FutureHR yerel kanıtları kullanıldı/i);
    await expect(page.locator("body")).not.toContainText("FutureHR Intelligence servisine ulaşılamadı");
  });

  test("provider-chain rules fallback preserves a verified answer", async ({ page }) => {
    await openIntelligence(page, "CEO");
    await page.route("**/api/ai/agent", route => route.fulfill({
      status:200,
      contentType:"application/json",
      body:JSON.stringify({
        mode:"rules", provider:"groq", configured:true, model:"futurehr-agent-fallback",
        analysis:rulesAnalysis("AI sağlayıcısı geçici olarak kullanılamıyor; FutureHR yerel karar desteği devam ediyor.", "Provider zinciri başarısız oldu; deterministik fallback kullanıldı."),
        note:"AI sentezi geçici olarak kullanılamıyor; doğrulanmış FutureHR araç sonuçları gösteriliyor.",
      }),
    }));
    await ask(page, "Ekibimde gelişim ve eğitim öncelikleri neler?", /FutureHR yerel karar desteği devam ediyor/i);
    await expect(page.locator("body")).not.toContainText("FutureHR Intelligence servisine ulaşılamadı");
  });

  test("non-2xx provider failure falls back locally without losing the verified package", async ({ page }) => {
    await openIntelligence(page, "CEO");
    await page.route("**/api/ai/agent", route => route.fulfill({
      status:503,
      contentType:"application/json",
      body:JSON.stringify({ error:"provider-off" }),
    }));
    await ask(page, "Ayşe Kaya için gelişim ve eğitim önceliklerini değerlendir.", /Ayşe Kaya|gelişim|performans|kanıt/i);
    await expect(page.locator("body")).not.toContainText("FutureHR Intelligence servisine ulaşılamadı");
  });
});