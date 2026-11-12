'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartType, ReportResult } from '@/lib/platform/report-types';

/**
 * Validated categorical palette (fixed slot order — never cycled; 9+ series fold into "Other").
 * Slots 3–5 are below 3:1 on light surfaces, so charts always ship a legend/labels and a table view.
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const OTHER = '#898781';
/** Ordinal blue ramp for funnels (light → dark, starting at step 250). */
const ORDINAL = ['#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];
const INK = { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' };

export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function full(n: number | null | undefined, isCurrency = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const s = n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return isCurrency ? `₹${s}` : s;
}

type Point = { label: string; value: number; series?: Record<string, number> };

/** Keep the first 8 categories, fold the rest into "Other". */
function foldOther(points: Point[], max = 8): Point[] {
  if (points.length <= max) return points;
  const sorted = [...points].sort((a, b) => b.value - a.value);
  const keep = sorted.slice(0, max - 1);
  const rest = sorted.slice(max - 1);
  return [...keep, { label: `Other (${rest.length})`, value: rest.reduce((s, p) => s + p.value, 0) }];
}

function ChartTooltip({ active, payload, label, valueLabel }: { active?: boolean; payload?: { name?: string; value?: number; color?: string; payload?: Point }[]; label?: string; valueLabel: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-[#0b0b0b] mb-1">{label ?? payload[0]?.payload?.label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[#52514e]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          <span>{payload.length > 1 ? p.name : valueLabel}</span>
          <span className="ml-auto pl-3 font-medium text-[#0b0b0b] tabular-nums">{full(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const axisProps = {
  tick: { fill: INK.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: INK.axis },
};

export function ReportChart({
  result,
  type,
  valueLabel,
  height = 280,
}: {
  result: ReportResult;
  type: ChartType;
  valueLabel: string;
  height?: number;
}) {
  if (type === 'none' || !result.chart.length) return null;

  if (type === 'funnel') {
    const pts = result.chart.slice(0, ORDINAL.length);
    const max = Math.max(...pts.map((p) => p.value), 1);
    return (
      <div className="space-y-1.5 py-2" role="img" aria-label={`Funnel of ${valueLabel}`}>
        {pts.map((p, i) => (
          <div key={p.label} className="flex items-center gap-3 text-xs" title={`${p.label}: ${full(p.value)}`}>
            <div className="w-32 shrink-0 truncate text-right text-[#52514e]">{p.label}</div>
            <div className="flex-1 flex justify-center">
              <div
                className="h-7 rounded-[4px] transition-all"
                style={{ width: `${Math.max((p.value / max) * 100, 2)}%`, background: ORDINAL[Math.min(i + 2, ORDINAL.length - 1)] }}
              />
            </div>
            <div className="w-16 shrink-0 tabular-nums text-[#0b0b0b] font-medium">{compact(p.value)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'donut') {
    const pts = foldOther(result.chart.filter((p) => p.value > 0));
    const total = pts.reduce((s, p) => s + p.value, 0);
    return (
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative" style={{ width: height, height, maxWidth: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pts} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="92%" stroke="#ffffff" strokeWidth={2} isAnimationActive={false}>
                {pts.map((p, i) => (
                  <Cell key={p.label} fill={p.label.startsWith('Other (') ? OTHER : SERIES[i % SERIES.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-xl font-semibold text-[#0b0b0b]">{compact(total)}</div>
            <div className="text-[11px] text-[#898781]">Total</div>
          </div>
        </div>
        <ul className="text-xs space-y-1 min-w-40">
          {pts.map((p, i) => (
            <li key={p.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.label.startsWith('Other (') ? OTHER : SERIES[i] }} />
              <span className="text-[#52514e] truncate">{p.label}</span>
              <span className="ml-auto pl-3 tabular-nums text-[#0b0b0b]">{compact(p.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const stacked = type === 'stackedColumn' && result.chartSeries.length > 0;
  const seriesNames = stacked ? result.chartSeries.slice(0, 8) : [];
  const data = result.chart.map((p) => ({ label: p.label, value: p.value, ...(stacked ? p.series : {}) }));
  const horizontal = type === 'bar';

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} axisLine={false} tickFormatter={compact} width={48} />
          <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} cursor={{ stroke: INK.axis }} />
          <Line type="monotone" dataKey="value" name={valueLabel} stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff', fill: SERIES[0] }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={horizontal ? Math.max(height, data.length * 28 + 40) : height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, bottom: 4, left: 0 }} barCategoryGap="20%" barGap={2}>
        <CartesianGrid stroke={INK.grid} horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...axisProps} tickFormatter={compact} />
            <YAxis type="category" dataKey="label" {...axisProps} width={120} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} axisLine={false} tickFormatter={compact} width={48} />
          </>
        )}
        <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
        {stacked ? (
          <>
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, color: INK.secondary }} />
            {seriesNames.map((s, i) => (
              <Bar
                key={s}
                dataKey={s}
                name={s}
                stackId="a"
                fill={SERIES[i]}
                stroke="#ffffff"
                strokeWidth={1}
                radius={i === seriesNames.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </>
        ) : (
          <Bar dataKey="value" name={valueLabel} fill={SERIES[0]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
