import { expect, test, type Page } from "@playwright/test";

async function seedDemoSession(page:Page){
  await page.addInitScript(()=>{
    window.localStorage.setItem("hr_current_user",JSON.stringify({
      username:"ceo",name:"Pelin Yılmaz",role:"CEO",dept:"Genel Yönetim",department:"Genel Yönetim",position:"Genel Müdür",authMode:"demo"
    }));
  });
}

async function seedIntelligenceFixture(page:Page, role:"CEO"|"EMPLOYEE"="CEO"){
  const user=role==="CEO"
    ? {username:"ceo",name:"Pelin Yılmaz",role:"CEO",dept:"Genel Yönetim",department:"Genel Yönetim",position:"Genel Müdür",authMode:"demo"}
    : {username:"ayse",name:"Ayşe Kaya",role:"EMPLOYEE",dept:"Finans",department:"Finans",position:"Finans Uzmanı",authMode:"demo"};
  await page.addInitScript(({user})=>{
    const org=[
      {id:"E-001","Personel Kodu":"E-001","Ad Soyad":"Ayşe Kaya",Departman:"Finans",Pozisyon:"Finans Uzmanı","Yönetici 1":"Pelin Yılmaz","Maaş (TL)":52000},
      {id:"E-002","Personel Kodu":"E-002","Ad Soyad":"Cem Yılmaz",Departman:"Teknoloji",Pozisyon:"Yazılım Uzmanı","Yönetici 1":"Pelin Yılmaz","Maaş (TL)":88000},
      {id:"E-003","Personel Kodu":"E-003","Ad Soyad":"Pelin Yılmaz",Departman:"Genel Yönetim",Pozisyon:"Genel Müdür","Maaş (TL)":120000},
    ];
    const history=[
      {id:"EV-001",Personel:"Ayşe Kaya",employee_id:"E-001",date:"2026-08-31",kpi_score:4.2,manager_performance_score:4.1,performance_score:4.15,evidence_score:82},
      {id:"EV-002",Personel:"Cem Yılmaz",employee_id:"E-002",date:"2026-08-31",kpi_score:3.6,manager_performance_score:3.5,performance_score:3.55,evidence_score:76},
    ];
    const candidates=[
      {id:"C-001",full_name:"Deniz Acar",name:"Deniz Acar",position:"Finans Analisti",status:"Teklif",test_sent:true,interview_done:true,reference_checked:false},
      {id:"C-002",full_name:"Mert Akın",name:"Mert Akın",position:"Yazılım Uzmanı",status:"Mülakat",test_sent:true,interview_done:true,reference_checked:true},
    ];
    const benchmarks=[{id:"B-001",Departman:"Finans",Pozisyon:"Finans Uzmanı","Piyasa Ortalaması":60000}];
    window.localStorage.setItem("hr_current_user",JSON.stringify(user));
    window.localStorage.setItem("hr_org_chart",JSON.stringify(org));
    window.localStorage.setItem("hr_history_360",JSON.stringify(history));
    window.localStorage.setItem("hr_candidates",JSON.stringify(candidates));
    window.localStorage.setItem("hr_candidate_results",JSON.stringify([]));
    window.localStorage.setItem("hr_assessments",JSON.stringify([]));
    window.localStorage.setItem("hr_training_assignments",JSON.stringify([]));
    window.localStorage.setItem("hr_development_plans",JSON.stringify([]));
    window.localStorage.setItem("hr_career_profiles",JSON.stringify([]));
    window.localStorage.setItem("hr_market_benchmarks",JSON.stringify(benchmarks));
    window.localStorage.setItem("hr_compensation_cycles",JSON.stringify([]));
    window.localStorage.setItem("hr_pulse_answers",JSON.stringify([]));
    window.localStorage.setItem("hr_leave_requests",JSON.stringify([]));
    window.localStorage.removeItem("hr_data_cleared");
  },{user});
}

async function openIntelligence(page:Page,route="/dashboard"){
  await page.goto(route,{waitUntil:"load"});
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  await page.waitForFunction(()=>document.readyState==="complete");
  await page.waitForTimeout(500);
  const trigger=page.getByRole("button",{name:"FutureHR Intelligence'ı aç"});
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded","false");
  await trigger.click({timeout:10_000});
  await expect(trigger).toHaveAttribute("aria-expanded","true");
  await expect(page.locator("#futurehr-agent-title")).toBeVisible({timeout:15_000});
  await expect(page.locator("#futurehr-agent-question")).toBeVisible();
}

async function askIntelligence(page:Page,question:string){
  await page.locator("#futurehr-agent-question").fill(question);
  await page.getByRole("button",{name:"Soruyu gönder"}).click();
  await expect(page.getByText(question,{exact:true})).toBeVisible();
  await expect(page.getByText(/Kanıt güveni:/).last()).toBeVisible({timeout:30_000});
}

async function noHorizontalOverflow(page:Page){
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBeTruthy();
}

test("public entry is usable",async({page},testInfo)=>{
  await page.goto("/");
  await expect(page.getByText("People Intelligence System").first()).toBeVisible();
  await expect(page.getByRole("button",{name:/Canlı Demoyu İncele|V1 Demo'yu Aç/i})).toBeVisible();
  if(testInfo.project.name==="mobile"){
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  }
  await noHorizontalOverflow(page);
});

test("critical workspaces render without viewport breakage",async({page},testInfo)=>{
  await seedDemoSession(page);
  for(const route of ["/dashboard","/organizasyon","/degerlendirme","/maas"]){
    await page.goto(route,{waitUntil:"domcontentloaded"});
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("main").first()).toBeVisible();
    await noHorizontalOverflow(page);
  }
  if(testInfo.project.name==="mobile")await expect(page.getByRole("navigation",{name:"Mobil hızlı menü"})).toBeVisible();
});

test("FutureHR Intelligence topbar trigger is actually clickable",async({page},testInfo)=>{
  test.skip(testInfo.project.name==="mobile","Desktop topbar hit-testing regression");
  await seedIntelligenceFixture(page,"CEO");
  await page.goto("/dashboard",{waitUntil:"load"});
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  await page.waitForTimeout(500);
  const trigger=page.getByRole("button",{name:"FutureHR Intelligence'ı aç"});
  await trigger.click({timeout:10_000});
  await expect(trigger).toHaveAttribute("aria-expanded","true");
});

test("FutureHR Intelligence reads deterministic employee facts exactly",async({page},testInfo)=>{
  test.skip(testInfo.project.name==="mobile","Intelligence logic audit runs once on desktop");
  await seedIntelligenceFixture(page,"CEO");
  const agentRequests:string[]=[];
  page.on("request",request=>{if(request.method()==="POST"&&request.url().includes("/api/ai/agent"))agentRequests.push(request.postData()||"");});
  await openIntelligence(page);
  await askIntelligence(page,"Ayşe Kaya'nın pozisyonu nedir?");
  await expect(page.getByText(/Ayşe Kaya'nın pozisyonu Finans Uzmanı; departmanı Finans/i)).toBeVisible();
  expect(agentRequests).toHaveLength(0);
});

test("FutureHR Intelligence keeps personal salary local and enforces RBAC",async({page},testInfo)=>{
  test.skip(testInfo.project.name==="mobile","Intelligence logic audit runs once on desktop");
  await seedIntelligenceFixture(page,"CEO");
  const agentRequests:string[]=[];
  page.on("request",request=>{if(request.method()==="POST"&&request.url().includes("/api/ai/agent"))agentRequests.push(request.postData()||"");});
  await openIntelligence(page);
  await askIntelligence(page,"Ayşe Kaya'nın maaşı nedir?");
  await expect(page.getByText(/Ayşe Kaya'nın FutureHR'da kayıtlı mevcut maaşı 52\.000 TL/i).first()).toBeVisible();
  expect(agentRequests).toHaveLength(0);

  await page.getByRole("button",{name:"FutureHR Intelligence'ı kapat"}).click();
  await seedIntelligenceFixture(page,"EMPLOYEE");
  await openIntelligence(page,"/kullanici");
  await askIntelligence(page,"Cem Yılmaz'ın maaşı nedir?");
  await expect(page.getByText(/mevcut yetki kapsamındaki FutureHR çalışan kayıtlarıyla eşleştirilemedi/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("88.000 TL");
});

test("FutureHR Intelligence anonymizes the complete external AI payload",async({page},testInfo)=>{
  test.skip(testInfo.project.name==="mobile","Intelligence logic audit runs once on desktop");
  await seedIntelligenceFixture(page,"CEO");
  const agentRequests:string[]=[];
  page.on("request",request=>{if(request.method()==="POST"&&request.url().includes("/api/ai/agent"))agentRequests.push(request.postData()||"");});
  await openIntelligence(page);
  await askIntelligence(page,"Ayşe Kaya için gelişim ve eğitim önceliklerini değerlendir.");
  expect(agentRequests.length).toBeGreaterThan(0);
  const body=agentRequests.at(-1)||"";
  expect(body).not.toContain("Ayşe Kaya");
  expect(body).not.toContain("Pelin Yılmaz");
  expect(body).not.toContain("52000");
  expect(body).not.toContain("Maaş (TL)");
  expect(body).toContain("seçili çalışan");
  expect(body).toContain("Çalışan-");
  await expect(page.locator("body")).not.toContainText("FutureHR Intelligence servisine ulaşılamadı");
});

test("FutureHR Intelligence answers recruitment lifecycle from exact records",async({page},testInfo)=>{
  test.skip(testInfo.project.name==="mobile","Intelligence logic audit runs once on desktop");
  await seedIntelligenceFixture(page,"CEO");
  const agentRequests:string[]=[];
  page.on("request",request=>{if(request.method()==="POST"&&request.url().includes("/api/ai/agent"))agentRequests.push(request.postData()||"");});
  await openIntelligence(page,"/ise-alim");
  await askIntelligence(page,"Teklif aşamasındaki adaylar kim?");
  await expect(page.getByText(/Deniz Acar \(Teklif\)/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Mert Akın (Mülakat)");
  expect(agentRequests).toHaveLength(0);
});

test("FutureHR Intelligence never turns high-impact HR advice into an automatic decision",async({page},testInfo)=>{
  test.skip(testInfo.project.name==="mobile","Intelligence logic audit runs once on desktop");
  await seedIntelligenceFixture(page,"CEO");
  await openIntelligence(page);
  await askIntelligence(page,"Ayşe Kaya terfi ettirilmeli mi?");
  const dialog=page.getByRole("dialog",{name:"FutureHR Intelligence"});
  await expect(dialog.getByText(/nihai insan kararlarını otomatik vermez|nihai karar insandadır|insan değerlendirmesi/i).last()).toBeVisible();
  await expect(dialog.getByText("Aksiyon sadece taslak",{exact:true})).toBeVisible();
});