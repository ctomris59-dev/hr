import {
  BadgePercent,
  CheckCircle2,
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
}> = [
  {
    key: "A",
    name: "Bütçe Dostu",
    short: "Performans matrisi",
    description: "Enflasyonu çalışan profiline göre kademelendirir; yüksek performansı ödüllendirirken toplam maliyeti kontrollü tutar.",
    principle: "Maliyet kontrolü",
    icon: WalletCards,
  },
  {
    key: "B",
    name: "Ücret Referansı Eşitleme",
    short: "Piyasa kurtarma",
    description: "Değerli çalışanları ücret bandındaki hedef seviyeye yaklaştırır; piyasanın gerisinde kalan kritik profillere daha güçlü müdahale eder.",
    principle: "Piyasa rekabeti",
    icon: TrendingUp,
  },
  {
    key: "C",
    name: "Dengeli",
    short: "Hibrit model",
    description: "Ücret bandı, performans ve maliyet baskısını birlikte ele alır; düşük bantları kademeli şekilde iyileştirir.",
    principle: "Dengeli optimizasyon",
    icon: Scale,
  },
  {
    key: "D",
    name: "Yönetici Talepleri",
    short: "Saha girdisi",
    description: "Yöneticilerin ücret artış taleplerini simülasyona taşır; talep bulunmayan çalışanlarda enflasyon varsayımını kullanır.",
    principle: "Yönetici görüşü",
    icon: UsersRound,
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
    <section className="enterprise-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          <p className="enterprise-eyebrow">Ücret senaryoları</p>
          <h2 className="mt-1 text-[16px] font-semibold text-slate-950 dark:text-white">Dört stratejiyi aynı çalışan setinde karşılaştırın</h2>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-500">
            Senaryo seçimi yalnızca karar görünümünü değiştirir. Maaşlar, ücret döngüsü kesinleşmeden ve insan onayı verilmeden güncellenmez.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700">
          <BadgePercent className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-400">Enflasyon varsayımı</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">%{inflation.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 p-4 lg:grid-cols-2 2xl:grid-cols-4">
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
              className={`relative overflow-hidden rounded-lg border p-4 text-left transition-colors ${
                active
                  ? "border-[#8fb1ad] bg-[#edf4f2] dark:border-[#557d79] dark:bg-[#172b2a]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/50"
              }`}
            >
              {active && <span className="absolute inset-y-0 left-0 w-[2px] bg-[#2f6664]" />}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold tracking-[0.1em] text-slate-400">SENARYO {item.key}</span>
                      {item.key === "C" && <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500 dark:border-slate-700">REFERANS</span>}
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{item.name}</h3>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">{item.short}</p>
                  </div>
                </div>
                {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2f6664]" />}
              </div>

              <p className="mt-4 min-h-[48px] text-[11px] leading-[1.55] text-slate-500 dark:text-slate-400">{item.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Aylık etki</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">+{money(stat.increase)}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Ort. artış</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">%{stat.avgRaise.toFixed(1)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>{item.principle}</span>
                <span>{stat.changed}/{employees.length} çalışan</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid border-t border-slate-100 bg-[#fafaf8] sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-950/30">
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
      <Icon className={`h-4 w-4 shrink-0 ${strong ? "text-[#2f6664]" : "text-slate-400"}`} />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
        <p className={`mt-0.5 truncate text-[11px] ${strong ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>{value}</p>
      </div>
    </div>
  );
}
