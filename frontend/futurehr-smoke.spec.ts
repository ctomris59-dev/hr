import { expect, test, type Page } from "@playwright/test";

async function seedDemoSession(page:Page){
  await page.addInitScript(()=>{
    window.localStorage.setItem("hr_current_user",JSON.stringify({
      username:"ceo",name:"Pelin Yılmaz",role:"CEO",dept:"Genel Yönetim",department:"Genel Yönetim",position:"Genel Müdür",authMode:"demo"
    }));
  });
}

async function noHorizontalOverflow(page:Page){
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBeTruthy();
}

test("public entry is usable",async({page},testInfo)=>{
  await page.goto("/");
  await expect(page.getByText("People Intelligence System").first()).toBeVisible();
  await expect(page.getByRole("button",{name:/V1 Demo'yu Aç/i})).toBeVisible();
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