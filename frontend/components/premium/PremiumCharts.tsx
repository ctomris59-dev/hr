"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "../charts/recharts";

export type PremiumSeries = {
  key: string;
  label: string;
  color: string;
};

export type PremiumTrendPoint = Record<string, string | number | null | undefined> & {
  label: string;
};

export type PremiumBarPoint = {
  label: string;
  value: number;
  color?: string;
  meta?: string;
};

export type PremiumDonutPoint = {
  label: string;
  value: number;
  color: string;
};

const defaultFormatter = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value);

function ChartTooltip({ active, payload, label, valueFormatter = defaultFormatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="pe-chart-tooltip min-w-[150px] rounded-xl border px-3 py-2.5 shadow-2xl">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] opacity-60">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item: any) => (
          <div key={`${item.dataKey}-${item.name}`} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex min-w-0 items-center gap-2 opacity-75">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color || item.stroke || item.fill }} />
              <span className="truncate">{item.name || item.dataKey}</span>
            </span>
            <strong className="tabular-nums">{valueFormatter(Number(item.value || 0))}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartFrame({ children, className = "", ariaLabel }: { children: React.ReactNode; className?: string; ariaLabel: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.995 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`pe-chart-frame ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      {children}
    </motion.div>
  );
}

export function PremiumAreaTrendChart({
  data,
  series,
  height = 280,
  ariaLabel = "Trend grafiği",
  valueFormatter = defaultFormatter,
}: {
  data: PremiumTrendPoint[];
  series: PremiumSeries[];
  height?: number;
  ariaLabel?: string;
  valueFormatter?: (value: number) => string;
}) {
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const safe = data.length ? data : [{ label: "—", value: 0 }];
  return (
    <ChartFrame ariaLabel={ariaLabel}>
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={safe} margin={{ top: 14, right: 10, left: -18, bottom: 0 }} accessibilityLayer>
            <defs>
              {series.map((item, index) => (
                <linearGradient key={item.key} id={`${id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.22} />
                  <stop offset="78%" stopColor={item.color} stopOpacity={0.03} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--pe-chart-grid)" strokeDasharray="4 6" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--pe-chart-axis)", fontSize: 10 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--pe-chart-axis)", fontSize: 10 }} width={42} />
            <Tooltip cursor={{ stroke: "var(--pe-chart-cursor)", strokeDasharray: "4 4" }} content={<ChartTooltip valueFormatter={valueFormatter} />} />
            {series.map((item, index) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2.6}
                fill={`url(#${id}-${index})`}
                dot={false}
                activeDot={{ r: 4.5, fill: item.color, stroke: "var(--pe-surface)", strokeWidth: 2.5 }}
                isAnimationActive={!reduced}
                animationDuration={780 + index * 80}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-2 text-[10px] font-medium text-[var(--pe-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}
          </span>
        ))}
      </div>
    </ChartFrame>
  );
}

export function PremiumLineChart({
  data,
  series,
  height = 260,
  ariaLabel = "Çizgi grafiği",
  valueFormatter = defaultFormatter,
}: {
  data: PremiumTrendPoint[];
  series: PremiumSeries[];
  height?: number;
  ariaLabel?: string;
  valueFormatter?: (value: number) => string;
}) {
  const reduced = useReducedMotion();
  return (
    <ChartFrame ariaLabel={ariaLabel}>
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 12, left: -18, bottom: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--pe-chart-grid)" strokeDasharray="4 6" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--pe-chart-axis)", fontSize: 10 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--pe-chart-axis)", fontSize: 10 }} width={42} />
            <Tooltip cursor={{ stroke: "var(--pe-chart-cursor)", strokeDasharray: "4 4" }} content={<ChartTooltip valueFormatter={valueFormatter} />} />
            {series.map((item, index) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: item.color, stroke: "var(--pe-surface)", strokeWidth: 2.5 }}
                isAnimationActive={!reduced}
                animationDuration={720 + index * 100}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function PremiumBarChart({
  data,
  height = 250,
  color = "#5b7cfa",
  ariaLabel = "Sütun grafiği",
  valueFormatter = defaultFormatter,
}: {
  data: PremiumBarPoint[];
  height?: number;
  color?: string;
  ariaLabel?: string;
  valueFormatter?: (value: number) => string;
}) {
  const reduced = useReducedMotion();
  const chartData = useMemo(() => data.map((item) => ({ ...item, fill: item.color || color })), [data, color]);
  return (
    <ChartFrame ariaLabel={ariaLabel}>
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--pe-chart-grid)" strokeDasharray="4 6" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--pe-chart-axis)", fontSize: 10 }} dy={8} interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--pe-chart-axis)", fontSize: 10 }} width={42} />
            <Tooltip cursor={{ fill: "var(--pe-chart-hover)" }} content={<ChartTooltip valueFormatter={valueFormatter} />} />
            <Bar dataKey="value" name="Değer" radius={[8, 8, 3, 3]} maxBarSize={44} isAnimationActive={!reduced} animationDuration={720} animationEasing="ease-out">
              {chartData.map((item, index) => <Cell key={`${item.label}-${index}`} fill={item.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function PremiumDonutChart({
  data,
  size = 190,
  centerLabel,
  centerValue,
  ariaLabel = "Dağılım grafiği",
}: {
  data: PremiumDonutPoint[];
  size?: number;
  centerLabel?: string;
  centerValue?: string | number;
  ariaLabel?: string;
}) {
  const reduced = useReducedMotion();
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return (
    <ChartFrame ariaLabel={ariaLabel} className="pe-donut-grid">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="67%"
              outerRadius="88%"
              paddingAngle={2.5}
              cornerRadius={7}
              stroke="var(--pe-surface)"
              strokeWidth={3}
              isAnimationActive={!reduced}
              animationBegin={80}
              animationDuration={820}
              animationEasing="ease-out"
            >
              {data.map((item) => <Cell key={item.label} fill={item.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <strong className="text-[26px] font-semibold tracking-[-.05em] text-[var(--pe-text)]">{centerValue ?? total}</strong>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[var(--pe-subtle)]">{centerLabel || "Toplam"}</span>
        </div>
      </div>
      <div className="min-w-0 space-y-2.5">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--pe-muted)]">{item.label}</span>
            <strong className="text-[11px] tabular-nums text-[var(--pe-text)]">{item.value}</strong>
            <span className="w-9 text-right text-[9px] tabular-nums text-[var(--pe-subtle)]">%{total ? Math.round((item.value / total) * 100) : 0}</span>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}
