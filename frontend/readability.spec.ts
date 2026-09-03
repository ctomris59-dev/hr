import { expect, test, type Page } from "@playwright/test";

const ROUTE_GROUPS = [
  ["/dashboard","/karar-merkezi","/organizasyon","/rol-mimarisi","/degerlendirme","/kalibrasyon","/yetenek-matrisi","/kariyer","/yedekleme"],
  ["/gelisim","/gelisim-analitigi","/egitim","/calisan-deneyimi","/izinler","/ekip-yonetimi","/ise-alim","/aday-testi","/yetkinlik-haritasi"],
  ["/maas","/ucret-adaleti","/yonetici/maas-talep","/butce-yonetimi","/kurulum","/admin","/admin/veri-aktarimi","/admin/guven-kvkk","/ayarlar/yetki-mimarisi","/turkiye-uyum"],
] as const;

async function openLightDemo(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("fhr_demo_tour_seen_v1", "1");
    localStorage.setItem("theme", "light");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "V1 Demo'yu Aç" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByTestId("app-shell")).toBeVisible();
}

async function severeReadabilityViolations(page: Page) {
  return page.evaluate(() => {
    type RGB = { r:number; g:number; b:number; a:number };
    const parse = (value:string):RGB|null => {
      const match=value.match(/rgba?\(([^)]+)\)/i);
      if(!match)return null;
      const parts=match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      if(parts.length<3||parts.slice(0,3).some(Number.isNaN))return null;
      return {r:parts[0],g:parts[1],b:parts[2],a:Number.isFinite(parts[3])?parts[3]:1};
    };
    const channel=(v:number)=>{const x=v/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);};
    const luminance=(c:RGB)=>.2126*channel(c.r)+.7152*channel(c.g)+.0722*channel(c.b);
    const contrast=(a:RGB,b:RGB)=>{const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};
    const blend=(fg:RGB,bg:RGB):RGB=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
    const visible=(node:HTMLElement)=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)>0&&r.width>1&&r.height>1;};
    const effectiveBackground=(node:HTMLElement):RGB=>{
      const layers:RGB[]=[];
      let current:HTMLElement|null=node;
      while(current){
        const c=parse(getComputedStyle(current).backgroundColor);
        if(c&&c.a>0)layers.push(c);
        current=current.parentElement;
      }
      let bg:RGB=node.closest(".futurehr-premium-sidebar")?{r:10,g:20,b:32,a:1}:{r:255,g:255,b:255,a:1};
      for(let index=layers.length-1;index>=0;index-=1)bg=blend(layers[index],bg);
      return bg;
    };
    const selector="p,span,label,a,button,h1,h2,h3,h4,h5,h6,td,th,strong,small,summary";
    const candidates=Array.from(document.querySelectorAll<HTMLElement>(selector));
    const violations:Array<{text:string;ratio:number;opacity:number;fontSize:number;className:string}>=[];
    for(const node of candidates){
      if(!visible(node)||node.closest('[aria-hidden="true"]'))continue;
      if(node.matches(":disabled")||node.closest("fieldset:disabled"))continue;
      const directText=Array.from(node.childNodes).some((child)=>child.nodeType===Node.TEXT_NODE&&(child.textContent||"").trim());
      if(!directText)continue;
      const text=Array.from(node.childNodes).filter((child)=>child.nodeType===Node.TEXT_NODE).map((child)=>child.textContent||"").join(" ").replace(/\s+/g," ").trim();
      if(!text||text.length>180)continue;
      const style=getComputedStyle(node);
      const bg=effectiveBackground(node);
      const fillRaw=style.getPropertyValue("-webkit-text-fill-color");
      const fill=fillRaw&&fillRaw!=="currentcolor"?parse(fillRaw):null;
      const parsedFg=fill||parse(style.color); if(!parsedFg)continue;
      const fg=parsedFg.a<1?blend(parsedFg,bg):parsedFg;
      const ratio=contrast(fg,bg);
      const opacity=Number(style.opacity||1);
      const fontSize=parseFloat(style.fontSize||"0");
      const fontWeight=parseInt(style.fontWeight||"400",10)||400;
      const large=fontSize>=18||(fontSize>=14&&fontWeight>=700);
      const floor=large?3:3.8;
      if(ratio<floor||opacity<.58){
        violations.push({text:text.slice(0,90),ratio:Number(ratio.toFixed(2)),opacity:Number(opacity.toFixed(2)),fontSize:Number(fontSize.toFixed(1)),className:String(node.className||"").slice(0,150)});
      }
    }
    return violations.slice(0,25);
  });
}

for (const [index, routes] of ROUTE_GROUPS.entries()) {
  test(`readability group ${index + 1} has no severely washed-out visible text`, async ({ page }) => {
    test.setTimeout(120_000);
    await openLightDemo(page);
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      const violations=await severeReadabilityViolations(page);
      expect(violations,`${route} low-contrast visible text`).toEqual([]);
    }
  });
}
