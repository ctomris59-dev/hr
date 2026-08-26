import fs from "node:fs";
import path from "node:path";

const pagePath = path.join(process.cwd(), "app", "(dashboard)", "yetenek-matrisi", "page.tsx");

if (!fs.existsSync(pagePath)) {
  console.error(`[talent-matrix-polish] Sayfa bulunamadı: ${pagePath}`);
  process.exit(1);
}

let source = fs.readFileSync(pagePath, "utf8");
let changes = 0;

function replaceOnce(label, from, to) {
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn(`[talent-matrix-polish] Eşleşme bulunamadı: ${label}`);
    return;
  }
  source = source.replace(from, to);
  changes += 1;
}

replaceOnce(
  "ReferenceArea import",
  "Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ReferenceLine",
  "Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ReferenceLine, ReferenceArea"
);

if (!source.includes("const NINE_BOX_META")) {
  const marker = "// Dinamik Gap Analizi (3 katmanlı: Mevcut, Yönetici, Hedef)";
  const insert = `const NINE_BOX_META = [
  { label: "7. Uyumsuz", x1: 1, x2: 3, y1: 4, y2: 5, x: 2, y: 4.5, fill: "#fff7ed", dot: "#f59e0b", text: "#9a3412" },
  { label: "4. Soru İşareti", x1: 3, x2: 4, y1: 4, y2: 5, x: 3.5, y: 4.5, fill: "#fefce8", dot: "#eab308", text: "#854d0e" },
  { label: "1. Yıldız Oyuncu", x1: 4, x2: 5, y1: 4, y2: 5, x: 4.5, y: 4.5, fill: "#eef2ff", dot: "#4f46e5", text: "#3730a3" },
  { label: "8. Etkili", x1: 1, x2: 3, y1: 3, y2: 4, x: 2, y: 3.5, fill: "#f0fdfa", dot: "#14b8a6", text: "#115e59" },
  { label: "5. Kilit Oyuncu", x1: 3, x2: 4, y1: 3, y2: 4, x: 3.5, y: 3.5, fill: "#ecfdf5", dot: "#10b981", text: "#065f46" },
  { label: "2. Yüksek Potansiyel", x1: 4, x2: 5, y1: 3, y2: 4, x: 4.5, y: 3.5, fill: "#eff6ff", dot: "#3b82f6", text: "#1d4ed8" },
  { label: "9. Riskli", x1: 1, x2: 3, y1: 1, y2: 3, x: 2, y: 2, fill: "#fef2f2", dot: "#ef4444", text: "#991b1b" },
  { label: "6. Güvenilir", x1: 3, x2: 4, y1: 1, y2: 3, x: 3.5, y: 2, fill: "#f8fafc", dot: "#64748b", text: "#334155" },
  { label: "3. Yüksek Performans", x1: 4, x2: 5, y1: 1, y2: 3, x: 4.5, y: 2, fill: "#f0f9ff", dot: "#0ea5e9", text: "#075985" },
] as const;

const get9BoxMeta = (label: string) =>
  NINE_BOX_META.find((item) => item.label === label) || NINE_BOX_META[7];

`;
  if (source.includes(marker)) {
    source = source.replace(marker, insert + marker);
    changes += 1;
  } else {
    console.warn("[talent-matrix-polish] NINE_BOX_META ekleme noktası bulunamadı.");
  }
}

const oldLabels = `  const boxLabels = useMemo(() => ([
    { x: 1, y: 5, label: "Yıldızlar" },
    { x: 3, y: 5, label: "Yüksek Pot." },
    { x: 5, y: 5, label: "Lider Adayı" },
    { x: 1, y: 3, label: "Geliştir" },
    { x: 3, y: 3, label: "Dengeli" },
    { x: 5, y: 3, label: "Kritik Rol" },
    { x: 1, y: 1, label: "Riskli" },
    { x: 3, y: 1, label: "Destek" },
    { x: 5, y: 1, label: "Uzman" },
  ]), []);
`;

const newLabels = `  const nineBoxCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    NINE_BOX_META.forEach((item) => { counts[item.label] = 0; });
    scatterData.forEach((employee) => {
      counts[employee.boxLabel] = (counts[employee.boxLabel] || 0) + 1;
    });
    return counts;
  }, [scatterData]);

  const boxLabels = useMemo(
    () => NINE_BOX_META.map((item) => ({ ...item, count: nineBoxCounts[item.label] || 0 })),
    [nineBoxCounts]
  );
`;

replaceOnce("9-box etiket verisi", oldLabels, newLabels);

const chartStart = source.indexOf("      {/* 9-BOX SCATTER CHART */}");
const chartEnd = source.indexOf("      {/* DETAIL ANALYSIS */}", chartStart);

if (chartStart !== -1 && chartEnd !== -1 && !source.includes("9-Box Yetenek Haritası")) {
  const newChart = `      {/* 9-BOX TALENT MAP */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">9-Box Yetenek Haritası</h3>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Performans × potansiyel · eşikler 3,0 / 4,0 · noktaya tıklayarak çalışan seçin</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 dark:border-indigo-900/50 dark:bg-indigo-950/25">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Yıldız</span>
              <strong className="text-sm text-indigo-950 dark:text-indigo-100">{nineBoxCounts["1. Yıldız Oyuncu"] || 0}</strong>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Kilit</span>
              <strong className="text-sm text-emerald-950 dark:text-emerald-100">{nineBoxCounts["5. Kilit Oyuncu"] || 0}</strong>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/25">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Risk</span>
              <strong className="text-sm text-red-950 dark:text-red-100">{nineBoxCounts["9. Riskli"] || 0}</strong>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {scatterData.length} çalışan
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="h-[470px] rounded-xl border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-950/30">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 28, right: 28, bottom: 34, left: 28 }}>
                {NINE_BOX_META.map((box) => (
                  <ReferenceArea
                    key={box.label}
                    x1={box.x1}
                    x2={box.x2}
                    y1={box.y1}
                    y2={box.y2}
                    fill={box.fill}
                    fillOpacity={0.72}
                    stroke="none"
                    ifOverflow="visible"
                  />
                ))}

                <CartesianGrid strokeDasharray="3 6" stroke="#dbe3ee" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="performance"
                  name="Performans"
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={{ stroke: "#94a3b8" }}
                  tickLine={false}
                  label={{ value: "PERFORMANS  →", position: "insideBottomRight", offset: -18, fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                />
                <YAxis
                  type="number"
                  dataKey="potential"
                  name="Potansiyel"
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={{ stroke: "#94a3b8" }}
                  tickLine={false}
                  label={{ value: "POTANSİYEL  →", angle: -90, position: "insideLeft", offset: -8, fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                />

                <ReferenceLine x={3} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1.25} />
                <ReferenceLine x={4} stroke="#64748b" strokeDasharray="5 5" strokeWidth={1.5} />
                <ReferenceLine y={3} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1.25} />
                <ReferenceLine y={4} stroke="#64748b" strokeDasharray="5 5" strokeWidth={1.5} />

                <Scatter
                  data={boxLabels}
                  isAnimationActive={false}
                  shape={(props: any) => (
                    <g pointerEvents="none">
                      <text
                        x={props.cx}
                        y={props.cy - 7}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={props.payload.text}
                        fontSize={10}
                        fontWeight={700}
                        opacity={0.72}
                      >
                        {props.payload.label}
                      </text>
                      <text
                        x={props.cx}
                        y={props.cy + 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={props.payload.text}
                        fontSize={9}
                        fontWeight={600}
                        opacity={0.5}
                      >
                        {props.payload.count} kişi
                      </text>
                    </g>
                  )}
                />

                <Tooltip
                  cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    if (!data?.name) return null;
                    const meta = get9BoxMeta(data.boxLabel);
                    return (
                      <div className="min-w-[210px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{data.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{data.position}</p>
                          </div>
                          <span className="rounded-md px-2 py-1 text-[9px] font-bold" style={{ backgroundColor: meta.fill, color: meta.text }}>
                            {data.boxLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                          <div>
                            <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">Performans</span>
                            <strong className="text-sm text-slate-800 dark:text-slate-200">{formatScore(data.performance)}</strong>
                          </div>
                          <div>
                            <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">Potansiyel</span>
                            <strong className="text-sm text-slate-800 dark:text-slate-200">{formatScore(data.potential)}</strong>
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-400">{data.department} · Detay için tıklayın</p>
                      </div>
                    );
                  }}
                />

                <Scatter
                  name="Çalışanlar"
                  data={scatterData}
                  isAnimationActive={true}
                  animationDuration={550}
                  shape={(props: any) => {
                    const data = props.payload;
                    const meta = get9BoxMeta(data.boxLabel);
                    const selected = data.id === selectedPersonId;
                    return (
                      <g
                        onClick={() => setSelectedPersonId(data.id)}
                        style={{ cursor: "pointer" }}
                        role="button"
                        aria-label={`${data.name} - ${data.boxLabel}`}
                      >
                        {selected && <circle cx={props.cx} cy={props.cy} r={11} fill={meta.dot} opacity={0.14} />}
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={selected ? 6.5 : 4.5}
                          fill={meta.dot}
                          fillOpacity={selected ? 1 : 0.78}
                          stroke={selected ? "#ffffff" : meta.dot}
                          strokeWidth={selected ? 2.5 : 1}
                        />
                      </g>
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-500">
              <span><strong className="text-slate-700 dark:text-slate-300">1–3:</strong> düşük</span>
              <span><strong className="text-slate-700 dark:text-slate-300">3–4:</strong> orta</span>
              <span><strong className="text-slate-700 dark:text-slate-300">4–5:</strong> yüksek</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
              Seçili çalışan daha büyük gösterilir
            </div>
          </div>
        </div>
      </section>

`;
  source = source.slice(0, chartStart) + newChart + source.slice(chartEnd);
  changes += 1;
}

if (changes > 0) {
  fs.writeFileSync(pagePath, source, "utf8");
  console.log(`[talent-matrix-polish] ${changes} iyileştirme uygulandı.`);
} else {
  console.log("[talent-matrix-polish] Yetenek Matrisi zaten güncel.");
}
