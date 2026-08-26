import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const noSsr = (loader: () => Promise<ComponentType<any>>) =>
  dynamic<any>(loader, { ssr: false });

export const ScatterChart = noSsr(() => import("recharts").then((m) => m.ScatterChart as ComponentType<any>));
export const Scatter = noSsr(() => import("recharts").then((m) => m.Scatter as ComponentType<any>));
export const XAxis = noSsr(() => import("recharts").then((m) => m.XAxis as ComponentType<any>));
export const YAxis = noSsr(() => import("recharts").then((m) => m.YAxis as ComponentType<any>));
export const CartesianGrid = noSsr(() => import("recharts").then((m) => m.CartesianGrid as ComponentType<any>));
export const Tooltip = noSsr(() => import("recharts").then((m) => m.Tooltip as ComponentType<any>));
export const ResponsiveContainer = noSsr(() => import("recharts").then((m) => m.ResponsiveContainer as ComponentType<any>));
export const BarChart = noSsr(() => import("recharts").then((m) => m.BarChart as ComponentType<any>));
export const Bar = noSsr(() => import("recharts").then((m) => m.Bar as ComponentType<any>));
export const PieChart = noSsr(() => import("recharts").then((m) => m.PieChart as ComponentType<any>));
export const Pie = noSsr(() => import("recharts").then((m) => m.Pie as ComponentType<any>));
export const Cell = noSsr(() => import("recharts").then((m) => m.Cell as ComponentType<any>));
export const RadarChart = noSsr(() => import("recharts").then((m) => m.RadarChart as ComponentType<any>));
export const Radar = noSsr(() => import("recharts").then((m) => m.Radar as ComponentType<any>));
export const PolarGrid = noSsr(() => import("recharts").then((m) => m.PolarGrid as ComponentType<any>));
export const PolarAngleAxis = noSsr(() => import("recharts").then((m) => m.PolarAngleAxis as ComponentType<any>));
export const PolarRadiusAxis = noSsr(() => import("recharts").then((m) => m.PolarRadiusAxis as ComponentType<any>));
export const ReferenceLine = noSsr(() => import("recharts").then((m) => m.ReferenceLine as ComponentType<any>));
export const ReferenceArea = noSsr(() => import("recharts").then((m) => m.ReferenceArea as ComponentType<any>));
export const LineChart = noSsr(() => import("recharts").then((m) => m.LineChart as ComponentType<any>));
export const Line = noSsr(() => import("recharts").then((m) => m.Line as ComponentType<any>));
export const Legend = noSsr(() => import("recharts").then((m) => m.Legend as ComponentType<any>));
export const Area = noSsr(() => import("recharts").then((m) => m.Area as ComponentType<any>));
