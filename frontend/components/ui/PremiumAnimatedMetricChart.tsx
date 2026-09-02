"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = Record<string, string | number>;
type Series = {
  key: string;
  label: string;
  color: string;
  type?: "line" | "area";
};

type Props = {
  data: Point[];
  xKey: string;
  series: Series[];
  height?: number;
  valueFormatter?: (value: number) => string;
  compact?: boolean;
  className?: string;
};

function PremiumTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-xl dark:border-slate-700/80 dark:bg-[#0c1723]/95">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.1em] text-slate-400">{label}</p>
      <div className="space-y-1">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-5 text-[11px]">
            <span className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <strong className="font-semibold text-slate-900 dark:text-white">
              {formatter ? formatter(Number(item.value)) : Number(item.value).toLocaleString("tr-TR")}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PremiumAnimatedMetricChart({
  data,
  xKey,
  series,
  height = 280,
  valueFormatter,
  compact = false,
  className = "",
}: Props) {
  const reducedMotion = useReducedMotion();
  const hasArea = series.some((item) => item.type === "area");
  const Chart = hasArea ? AreaChart : LineChart;
  const gradientId = `futurehr-gradient-${series.map((item) => item.key).join("-")}`.replace(/[^a-zA-Z0-9-_]/g, "");

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`futurehr-premium-chart min-w-0 ${className}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 10, right: 6, left: compact ? -24 : -10, bottom: 0 }}>
          <defs>
            {series.map((item, index) => (
              <linearGradient key={item.key} id={`${gradientId}-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={item.color} stopOpacity={0.24} />
                <stop offset="92%" stopColor={item.color} stopOpacity={0.015} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200/70 dark:text-slate-700/45" strokeDasharray="3 7" />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} minTickGap={20} tick={{ fill: "currentColor", fontSize: 10 }} className="text-slate-400" dy={8} />
          {!compact && <YAxis axisLine={false} tickLine={false} width={44} tick={{ fill: "currentColor", fontSize: 10 }} className="text-slate-400" />}
          <Tooltip cursor={{ stroke: "rgba(148,163,184,.25)", strokeDasharray: "4 5" }} content={<PremiumTooltip formatter={valueFormatter} />} />
          {series.map((item, index) => item.type === "area" ? (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={2.4}
              fill={`url(#${gradientId}-${index})`}
              activeDot={{ r: 4, strokeWidth: 3, fill: item.color, stroke: "var(--pe-surface, #fff)" }}
              isAnimationActive={!reducedMotion}
              animationDuration={850 + index * 110}
              animationEasing="ease-out"
            />
          ) : (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={2.4}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 3, fill: item.color, stroke: "var(--pe-surface, #fff)" }}
              isAnimationActive={!reducedMotion}
              animationDuration={850 + index * 110}
              animationEasing="ease-out"
            />
          ))}
        </Chart>
      </ResponsiveContainer>
    </motion.div>
  );
}
