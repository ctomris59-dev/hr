import fs from "node:fs";
import path from "node:path";

const dashboardPath = path.join(process.cwd(), "app", "(dashboard)", "dashboard", "page.tsx");

if (!fs.existsSync(dashboardPath)) {
  console.error(`[dashboard-polish] Dashboard bulunamadı: ${dashboardPath}`);
  process.exit(1);
}

let source = fs.readFileSync(dashboardPath, "utf8");
let changes = 0;

function replaceOnce(label, from, to) {
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn(`[dashboard-polish] Eşleşme bulunamadı: ${label}`);
    return;
  }
  source = source.replace(from, to);
  changes += 1;
}

replaceOnce(
  "performans hedefi etiketi",
  '<span className="text-[11px] font-medium text-slate-400">Hedef skor {TARGET_SCORE}</span>',
  '<span className="text-[11px] font-medium text-slate-400">Performans hedefi {TARGET_SCORE.toFixed(1).replace(".", ",")}</span>'
);

replaceOnce(
  "hızlı işlem aralığı",
  '        <div className="flex flex-wrap items-center gap-1.5">\n          <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 2xl:inline">Hızlı işlemler</span>',
  '        <div className="flex flex-wrap items-center gap-2">\n          <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 2xl:inline">Hızlı işlemler</span>'
);

replaceOnce(
  "KPI performans hedefi",
  '<p className="mt-1 text-[11px] text-slate-400">Hedef {TARGET_SCORE}</p>',
  '<p className="mt-1 text-[11px] text-slate-400">Performans hedefi {TARGET_SCORE.toFixed(1).replace(".", ",")}</p>'
);

replaceOnce(
  "risk oranı",
  '<span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">Aksiyon gerekli</span>',
  '<div className="flex flex-col items-end gap-1">\n                <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">Aksiyon gerekli</span>\n                <span className="text-[10px] font-medium text-slate-400">\n                  {filteredData.length > 0 ? `${riskyCount} / ${filteredData.length} · %${((riskyCount / filteredData.length) * 100).toFixed(1).replace(".", ",")}` : "—"}\n                </span>\n              </div>'
);

replaceOnce(
  "yıldız çalışan oranı",
  '<span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Üst segment</span>',
  '<div className="flex flex-col items-end gap-1">\n                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Üst segment</span>\n                <span className="text-[10px] font-medium text-slate-400">\n                  {filteredData.length > 0 ? `${starsCount || 0} / ${filteredData.length} · %${((((starsCount || 0) / filteredData.length) * 100)).toFixed(1).replace(".", ",")}` : "—"}\n                </span>\n              </div>'
);

replaceOnce(
  "mutluluk kartı yoğunluğu",
  '<div className="enterprise-card mb-5 p-5">\n        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">',
  '<div className="enterprise-card mb-5 p-4">\n        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">'
);

replaceOnce(
  "mutluluk grafik yüksekliği",
  '        {pulseTrends.length > 0 ? (\n          <ResponsiveContainer width="100%" height={300}>',
  '        {pulseTrends.length > 0 ? (\n          <ResponsiveContainer width="100%" height={240}>'
);

replaceOnce(
  "mutluluk hedef etiketi",
  '<ReferenceLine y={7} stroke="#16a34a" strokeDasharray="4 4" label={{ value: "Hedef 7.0", position: "insideTopRight", fill: "#16a34a", fontSize: 10 }} />',
  '<ReferenceLine y={7} stroke="#16a34a" strokeDasharray="4 4" label={{ value: "Mutluluk hedefi 7,0", position: "insideTopRight", fill: "#16a34a", fontSize: 10 }} />'
);

if (changes > 0) {
  fs.writeFileSync(dashboardPath, source, "utf8");
  console.log(`[dashboard-polish] ${changes} iyileştirme uygulandı.`);
} else {
  console.log("[dashboard-polish] Dashboard zaten güncel.");
}
