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
      const rgb=value.match(/rgba?\(([^)]+)\)/i);
      if(rgb){
        const parts=rgb[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        if(parts.length>=3&&!parts.slice(0,3).some(Number.isNaN))return {r:parts[0],g:parts[1],b:parts[2],a:Number.isFinite(parts[3])?parts[3]:1};
      }
      const srgb=value.match(/color\(srgb\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)(?:\s*\/\s*([\d.+-]+))?\)/i);
      if(srgb){
        const values=srgb.slice(1,4).map(Number);
        if(!values.some(Number.isNaN))return {r:values[0]*255,g:values[1]*255,b:values[2]*255,a:Number.isFinite(Number(srgb[4]))?Number(srgb[4]):1};
      }
      return null;
    };
    const channel=(v:number)=>{const x=Math.max(0,Math.min(255,v))/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);};
    const luminance=(c:RGB)=>.2126*channel(c.r)+.7152*channel(c.g)+.0722*channel(c.b);
    const contrast=(a:RGB,b:RGB)=>{const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};
    const blend=(fg:RGB,bg:RGB):RGB=>{const alpha=fg.a+bg.a*(1-fg.a);if(alpha<=0)return{r:0,g:0,b:0,a:0};return{r:(fg.r*fg.a+bg.r*bg.a*(1-fg.a))/alpha,g:(fg.g*fg.a+bg.g*bg.a*(1-fg.a))/alpha,b:(fg.b*fg.a+bg.b*bg.a*(1-fg.a))/alpha,a:alpha};};
    const visible=(node:HTMLElement)=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)>.02&&r.width>1&&r.height>1;};
    const effectiveBackground=(node:HTMLElement):RGB|null=>{
      const layers:RGB[]=[];
      let current:HTMLElement|null=node;
      while(current){
        const style=getComputedStyle(current);
        if(style.backgroundImage&&style.backgroundImage!=="none")return null;
        const raw=style.backgroundColor;
        const c=parse(raw);
        const transparent=raw==="transparent"||/rgba?\(0(?:[ ,]+0){2}(?:[ ,/]+0(?:\.0+)?)?\)/i.test(raw);
        if(!c&&!transparent)return null;
        if(c&&c.a>0){layers.push(c);if(c.a>=.999)break;}
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
      if(!bg)continue;
      const fillRaw=style.getPropertyValue("-webkit-text-fill-color");
      const rawColor=fillRaw&&fillRaw!=="transparent"&&fillRaw!=="currentcolor"?fillRaw:style.color;
      const parsedColor=parse(rawColor);
      if(!parsedColor)continue;
      const opacity=Number(style.opacity||1);
      if(opacity<.25)continue;
      const fg=blend({...parsedColor,a:parsedColor.a*opacity},bg);
      const ratio=contrast(fg,bg);
      const fontSize=parseFloat(style.fontSize||"0");
      const fontWeight=parseInt(style.fontWeight||"400",10)||400;
      const large=fontSize>=24||(fontSize>=18.66&&fontWeight>=700);
      const floor=large?3:4.5;
      if(ratio<floor){violations.push({text:text.slice(0,90),ratio:Number(ratio.toFixed(2)),opacity:Number(opacity.toFixed(2)),fontSize:Number(fontSize.toFixed(1)),className:String(node.className||"").slice(0,150)});}
    }
    return violations.slice(0,40);
  });
}

for (const [index, routes] of ROUTE_GROUPS.entries()) {
  test(`readability group ${index + 1} meets visible text contrast`, async ({ page }) => {
    test.setTimeout(120_000);
    await openLightDemo(page);
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(400);
      const violations=await severeReadabilityViolations(page);
      expect(violations,`${route} low-contrast visible text`).toEqual([]);
    }
  });
}
