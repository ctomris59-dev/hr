import {
  BadgePercent,
  CheckCircle2,
  Gauge,
  Scale,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  EmployeeData,
  MarketReference,
  runScenarioLogic,
} from "../../app/utils/salarySimulation";

type ScenarioKey = "A" | "B" | "C" | "D";

type BudgetRequest = {
  employee_id: string;
  requested_rate: number;
  status: "Taslak" | "Gönderildi";
};

interface SalaryScenarioStudioProps {
  scenario: ScenarioKey;
  onChange: (scenario: ScenarioKey) => void;
  employees: EmployeeData[];
  marketRefs: MarketReference[];
  inflation: number;
  budgetRequests?: BudgetRequest[];
}

const SCENARIOS: Array<{
  key: ScenarioKey;
  name: string;
  short: string;
  description: string;
  principle: string;
  icon: typeof WalletCards;
  tone: string;
  selectedTone: string;
}> = [
  {
    key: "A",
    name: "Bütçe Dostu",
    short: "Performans matrisi",
    description: "Enflasyonu çalışan profiline göre kademelendirir; yüksek performansı ödüllendirirken toplam maliyeti kontrollü tutar.",
    principle: "Maliyet kontrolü",
    icon: WalletCards,
    tone: "text-blue-700 bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/60",
    selectedTone: "from-blue-600 to-indigo-700",
  },
  {
    key: "B",
    name: "Ücret Referansı Eşitleme",
    short: "Piyasa kurtarma",
    description: "Değerli çalışanları ücret bandındaki hedef seviyeye yaklaştırır; piyasanın gerisinde kalan kritik profillere daha güçlü müdahale eder.",
    principle: "Piyasa rekabeti",
    icon: TrendingUp,
    tone: "text-violet-700 bg-violet-50 border-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/60",
    selectedTone: "from-violet-600 to-purple-700",
  },
  {
    key: "C",
    name: "Dengeli",
    short: "Hibrit model",
    description: "Ücret bandı, performans ve maliyet baskısını birlikte ele alır; düşük bantları kademeli şekilde iyileştirir.",
    principle: "Dengeli optimizasyon",
    icon: Scale,
    tone: "text-teal-700 bg-teal-50 border-teal-100 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/60",
    selectedTone: "from-teal-600 to-emerald-700",
  },
  {
    key: "D",
    name: "Yönetici Talepleri",
    short: "Saha girdisi",
    description: "Yöneticilerin ücret artış taleplerini simülasyona taşır; talep bulunmayan çalışanlarda enflasyon varsayımını kullanır.",
    principle: "Yönetici görüşü",
    icon: UsersRound,
    tone: "text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/60",
    selectedTone: "from-amber-500 to-orange-600",
  },
];

function money(value: number) {
  return `${Math.round(value).toLocaleString("tr-TR")} ₺`;
}

export default function SalaryScenarioStudio({
  scenario,
  onChange,
  employees,
  marketRefs,
  inflation,
  budgetRequests = [],
}: SalaryScenarioStudioProps) {
  const currentTotal = employees.reduce((sum, employee) => sum + employee["Mevcut Maaş"], 0);

  const snapshots = Object.fromEntries(
    SCENARIOS.map((item) => {
      const rows = runScenarioLogic(
        employees,
        marketRefs,
        inflation,
        item.key,
        item.key === "D" ? budgetRequests : undefined
      );
      const total = rows.reduce((sum, row) => sum + row["Yeni Maaş"], 0);
      const increase = total - currentTotal;
      const avgRaise = rows.length
        ? rows.reduce((sum, row) => sum + row["Zam Oranı (%)"], 0) / rows.length
        : 0;
      const changed = rows.filter((row) => row["Yeni Maaş"] !== row["Mevcut Maaş"]).length;
      return [item.key, { total, increase, avgRaise, changed }];
    })
  ) as Record<ScenarioKey, { total: number; increase: number; avgRaise: number; changed: number }>;

  const selected = snapshots[scenario];
  const selectedMeta = SCENARIOS.find((item) => item.key === scenario)!;
  const managerRequestCount = budgetRequests.filter((request) => request.status === "Gönderildi").length;

  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03),0_16px_42px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Gauge className="h-4 w-4 text-teal-300" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-300">FutureHR ücret karar motoru</p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-[-0.025em]">4 senaryoyu karşılaştır, sonra karar ver</h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-300">
            Aynı çalışan setini dört farklı ücret stratejisiyle eş zamanlı hesaplıyoruz. Kart seçimi yalnızca simülasyon görünümünü değiştirir; hiçbir maaş doğrudan güncellenmez.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
          <BadgePercent className="h-4 w-4 text-teal-300" />
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-400">Enflasyon varsayımı</p>
            <p className="text-sm font-semibold">%{inflation.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-4">
        {SCENARIOS.map((item) => {
          const Icon = item.icon;
          const active = scenario === item.key;
          const stat = snapshots[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-pressed={active}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                active
                  ? `border-transparent bg-gradient-to-br ${item.selectedTone} text-white shadow-[0_12px_28px_rgba(15,23,42,.18)] ring-2 ring-offset-2 ring-slate-900/10 dark:ring-offset-slate-900`
                  : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_26px_rgba(15,23,42,.08)] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${active ? "border-white/15 bg-white/10 text-white" : item.tone}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black tracking-[0.12em] ${active ? "text-white/70" : "text-slate-400"}`}>SENARYO {item.key}</span>
                      {item.key === "C" && !active && <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[8px] font-bold text-teal-700">DENGELİ</span>}
                    </div>
                    <h3 className={`mt-0.5 text-sm font-bold ${active ? "text-white" : "text-slate-900 dark:text-white"}`}>{item.name}</h3>
                    <p className={`mt-0.5 text-[10px] font-medium ${active ? "text-white/70" : "text-slate-400"}`}>{item.short}</p>
                  </div>
                </div>
                {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />}
              </div>

              <p className={`mt-4 min-h-[48px] text-[11px] leading-[1.55] ${active ? "text-white/85" : "text-slate-500 dark:text-slate-400"}`}>{item.description}</p>

              <div className={`mt-4 grid grid-cols-2 gap-2 border-t pt-3 ${active ? "border-white/15" : "border-slate-100 dark:border-slate-800"}`}>
                <div>
                  <p className={`text-[9px] uppercase tracking-wide ${active ? "text-white/55" : "text-slate-400"}`}>Aylık etki</p>
                  <p className={`mt-1 text-xs font-bold ${active ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>+{money(stat.increase)}</p>
                </div>
                <div>
                  <p className={`text-[9px] uppercase tracking-wide ${active ? "text-white/55" : "text-slate-400"}`}>Ort. artış</p>
                  <p className={`mt-1 text-xs font-bold ${active ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>%{stat.avgRaise.toFixed(1)}</p>
                </div>
              </div>

              <div className={`mt-3 flex items-center justify-between rounded-lg px-2.5 py-2 text-[9px] font-semibold ${active ? "bg-black/10 text-white/85" : "bg-slate-50 text-slate-500 dark:bg-slate-800/70 dark:text-slate-400"}`}>
                <span>{item.principle}</span>
                <span>{stat.changed}/{employees.length} çalışan etkileniyor</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid border-t border-slate-100 bg-slate-50/70 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-950/40">
        <SummaryItem label="Seçili strateji" value={`Senaryo ${scenario} · ${selectedMeta.name}`} strong icon={ShieldCheck} />
        <SummaryItem label="Yeni aylık toplam" value={money(selected.total)} icon={WalletCards} />
        <SummaryItem label="Yıllık ek maliyet" value={money(selected.increase * 12)} icon={TrendingUp} />
        <SummaryItem
          label="Yönetici talebi"
          value={scenario === "D" ? `${managerRequestCount} gönderilmiş talep` : "Senaryo D'de kullanılır"}
          icon={UsersRound}
        />
      </div>
    </section>
  );
}

function SummaryItem({
  label,
  value,
  strong = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  strong?: boolean;
  icon: typeof WalletCards;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-slate-800">
      <Icon className={`h-4 w-4 shrink-0 ${strong ? "text-teal-600" : "text-slate-400"}`} />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
        <p className={`mt-0.5 truncate text-[11px] ${strong ? "font-bold text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-300"}`}>{value}</p>
      </div>
    </div>
  );
}
