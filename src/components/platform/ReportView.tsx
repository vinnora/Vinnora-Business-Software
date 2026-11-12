'use client';

import { Fragment } from 'react';
import type { GroupNode, ReportDefinition, ReportResult } from '@/lib/platform/report-types';
import type { FieldDescribe } from '@/lib/platform/types';
import { FieldValue } from './RecordForm';
import { ReportChart, compact, full } from './ReportChart';

export function chartValueLabel(def: ReportDefinition, result: ReportResult) {
  const idx = def.chart?.aggregateIndex ?? -1;
  return idx >= 0 && result.aggregateLabels[idx] ? result.aggregateLabels[idx] : 'Record count';
}

function StatTile({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="bg-white border border-[var(--p-border)] rounded-lg px-4 py-3 min-w-36" title={title}>
      <div className="text-[11px] uppercase tracking-wide text-[#898781]">{label}</div>
      <div className="text-2xl font-semibold text-[#0b0b0b] mt-0.5">{value}</div>
    </div>
  );
}

export function ReportView({ def, result, fields = [] }: { def: ReportDefinition; result: ReportResult; fields?: FieldDescribe[] }) {
  const aggFields = def.aggregates.filter((a) => !result.hiddenFields.includes(a.field));
  const isCurrency = (i: number) => {
    const f = result.columns.find((c) => c.apiName === aggFields[i]?.field);
    return f?.type === 'currency';
  };
  const chartType = def.chart?.type || 'none';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatTile label="Total records" value={result.totals.count.toLocaleString('en-IN')} />
        {result.aggregateLabels.map((l, i) => (
          <StatTile key={l} label={l} value={compact(result.totals.values[i])} title={full(result.totals.values[i], isCurrency(i))} />
        ))}
      </div>
      {(result.truncated || result.hiddenFields.length > 0) && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {result.truncated && <div>Showing the first 50,000 of {result.totalRecords.toLocaleString('en-IN')} records. Add filters to narrow it down.</div>}
          {result.hiddenFields.length > 0 && <div>Some fields are hidden from you by field-level security: {result.hiddenFields.join(', ')}.</div>}
        </div>
      )}
      {chartType !== 'none' && def.format !== 'tabular' && result.chart.length > 0 && (
        <div className="bg-white border border-[var(--p-border)] rounded-lg p-4">
          <div className="text-sm font-medium text-[#0b0b0b] mb-2">
            {chartValueLabel(def, result)} by {def.groupings[0] ? fieldLabel(result, def.groupings[0].field, fields) : ''}
          </div>
          <ReportChart result={result} type={chartType} valueLabel={chartValueLabel(def, result)} />
        </div>
      )}
      <div className="bg-white border border-[var(--p-border)] rounded-lg overflow-x-auto">
        {def.format === 'tabular' && <TabularTable result={result} />}
        {def.format === 'summary' && <SummaryTable def={def} result={result} fields={fields} />}
        {def.format === 'matrix' && <MatrixTable result={result} />}
      </div>
    </div>
  );
}

function fieldLabel(result: ReportResult, api: string, fields: FieldDescribe[] = []) {
  return fields.find((f) => f.apiName === api)?.label || result.columns.find((c) => c.apiName === api)?.label || api.replace(/__c$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
}

const thc = 'text-left font-semibold px-3 py-2 text-[11px] uppercase tracking-wide text-gray-600 whitespace-nowrap';
const tdc = 'px-3 py-1.5 border-t border-gray-100 align-top';

function Cell({ field, row }: { field: FieldDescribe; row: Record<string, unknown> }) {
  const numeric = ['number', 'currency', 'percent'].includes(field.type === 'formula' ? field.returnType || '' : field.type);
  return (
    <td className={`${tdc} ${numeric ? 'text-right tabular-nums' : ''}`}>
      <FieldValue field={field} record={row} />
    </td>
  );
}

function TabularTable({ result }: { result: ReportResult }) {
  if (!result.rows.length) return <div className="p-6 text-center text-sm text-gray-500">No records match this report.</div>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          {result.columns.map((c) => (
            <th key={c.apiName} className={thc}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((r, i) => (
          <tr key={String(r._id ?? i)} className="hover:bg-gray-50">
            {result.columns.map((c) => (
              <Cell key={c.apiName} field={c} row={r} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SummaryTable({ def, result, fields }: { def: ReportDefinition; result: ReportResult; fields: FieldDescribe[] }) {
  if (!result.groups.length) return <div className="p-6 text-center text-sm text-gray-500">No records match this report.</div>;
  const span = Math.max(result.columns.length, 1);
  const summaryText = (n: { count: number; values: (number | null)[] }) =>
    [`${n.count} record${n.count === 1 ? '' : 's'}`, ...result.aggregateLabels.map((l, i) => `${l}: ${full(n.values[i])}`)].join(' · ');

  const renderGroup = (g: GroupNode, depth: number, path: string): React.ReactNode => (
    <Fragment key={`${path}/${g.key}`}>
      <tr className={depth === 0 ? 'bg-gray-100' : 'bg-gray-50'}>
        <td colSpan={span} className="px-3 py-1.5 border-t border-gray-200 text-sm" style={{ paddingLeft: 12 + depth * 18 }}>
          <span className="text-gray-500 text-xs mr-1">{fieldLabel(result, def.groupings[depth]?.field || '', fields)}:</span>
          <span className="font-semibold text-[#0b0b0b]">{g.label}</span>
          <span className="ml-3 text-xs text-gray-600">{summaryText(g)}</span>
        </td>
      </tr>
      {g.children?.map((c) => renderGroup(c, depth + 1, `${path}/${g.key}`))}
      {g.rows?.map((r, i) => (
        <tr key={String(r._id ?? i)} className="hover:bg-gray-50">
          {result.columns.map((c) => (
            <Cell key={c.apiName} field={c} row={r} />
          ))}
        </tr>
      ))}
    </Fragment>
  );

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          {result.columns.map((c) => (
            <th key={c.apiName} className={thc}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.groups.map((g) => renderGroup(g, 0, ''))}
        <tr className="bg-gray-100 font-semibold">
          <td colSpan={span} className="px-3 py-2 border-t border-gray-300 text-sm">
            Grand total · {summaryText(result.totals)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function MatrixTable({ result }: { result: ReportResult }) {
  const m = result.matrix;
  if (!m || !m.rows.length) return <div className="p-6 text-center text-sm text-gray-500">No records match this report.</div>;
  const show = (c?: { count: number; values: (number | null)[] }) => {
    if (!c) return <span className="text-gray-300">—</span>;
    return (
      <>
        <div className="tabular-nums">{c.count}</div>
        {result.aggregateLabels.map((l, i) => (
          <div key={l} className="text-[11px] text-gray-500 tabular-nums" title={l}>
            {compact(c.values[i])}
          </div>
        ))}
      </>
    );
  };
  return (
    <table className="text-sm min-w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className={thc}></th>
          {m.cols.map((c) => (
            <th key={c.key} className={`${thc} text-right`}>
              {c.label}
            </th>
          ))}
          <th className={`${thc} text-right`}>Total</th>
        </tr>
      </thead>
      <tbody>
        {m.rows.map((r) => (
          <tr key={r.key} className="hover:bg-gray-50">
            <th className={`${tdc} text-left font-medium`}>{r.label}</th>
            {m.cols.map((c) => (
              <td key={c.key} className={`${tdc} text-right`}>
                {show(m.cells[r.key]?.[c.key])}
              </td>
            ))}
            <td className={`${tdc} text-right font-semibold bg-gray-50`}>{show(m.rowTotals[r.key])}</td>
          </tr>
        ))}
        <tr className="bg-gray-100 font-semibold">
          <th className={`${tdc} text-left`}>Total</th>
          {m.cols.map((c) => (
            <td key={c.key} className={`${tdc} text-right`}>
              {show(m.colTotals[c.key])}
            </td>
          ))}
          <td className={`${tdc} text-right`}>{show(result.totals)}</td>
        </tr>
      </tbody>
    </table>
  );
}
