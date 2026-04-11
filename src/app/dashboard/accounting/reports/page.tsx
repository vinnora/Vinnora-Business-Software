'use client';

import { useEffect, useState } from 'react';
import { PageHeader, fmtINR, Badge, PrimaryButton, SecondaryButton } from '../_components/ui';

const REPORTS = [
  { id: 'income-statement', name: 'Income Statement', desc: 'Profit & Loss summary' },
  { id: 'balance-sheet', name: 'Balance Sheet', desc: 'Assets, Liabilities & Equity' },
  { id: 'receivables', name: 'A/R Aging', desc: 'Receivables by age bucket' },
  { id: 'payables', name: 'A/P Aging', desc: 'Payables by age bucket' },
  { id: 'asset-summary', name: 'Asset Summary', desc: 'Fixed asset register' },
];

export default function ReportsPage() {
  const [selected, setSelected] = useState('income-statement');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const generate = async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: selected });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const data = await fetch(`/api/accounting/reports?${params}`).then((r) => r.json());
    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    generate();
  }, [selected]);

  const exportCSV = () => {
    if (!report) return;
    const flat = JSON.stringify(report, null, 2);
    const blob = new Blob([flat], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Reports &amp; Analytics"
        subtitle="Financial Reports"
        actions={
          <>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded" />
            <PrimaryButton onClick={generate}>Refresh</PrimaryButton>
            <SecondaryButton onClick={exportCSV}>Export</SecondaryButton>
          </>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg overflow-hidden h-fit">
          <div className="px-4 py-2 bg-[#f3f3f3] text-xs uppercase text-gray-600 font-semibold">
            Available Reports
          </div>
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`w-full text-left px-4 py-3 border-t border-gray-100 ${
                selected === r.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">{r.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-lg p-6">
          {loading ? (
            <div className="text-sm text-gray-500">Generating…</div>
          ) : !report ? (
            <div className="text-sm text-gray-500">Select a report.</div>
          ) : (
            <ReportRenderer type={selected} data={report} />
          )}
        </div>
      </div>
    </>
  );
}

function ReportRenderer({ type, data }: { type: string; data: any }) {
  if (type === 'income-statement') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Income Statement</h2>
        <div className="text-xs text-gray-500 mb-6">{data.period || 'All time'}</div>
        <div className="space-y-2 max-w-md">
          <Row label="Revenue" value={data.revenue || 0} bold />
          <Row label="Expenses" value={-(data.expenses || 0)} />
          <div className="border-t border-gray-300 my-2" />
          <Row label="Net Income" value={data.netIncome || 0} bold large />
        </div>
      </div>
    );
  }
  if (type === 'balance-sheet') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Balance Sheet</h2>
        <div className="space-y-2 max-w-md">
          <Row label="Total Assets" value={data.assets || 0} bold />
          <Row label="Total Liabilities" value={data.liabilities || 0} />
          <div className="border-t border-gray-300 my-2" />
          <Row label="Equity" value={data.equity || 0} bold large />
        </div>
      </div>
    );
  }
  if (type === 'receivables') {
    const a = data.aging || {};
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">A/R Aging</h2>
        <div className="text-xs text-gray-500 mb-6">Total outstanding: {fmtINR(data.totalOutstanding)}</div>
        <table className="w-full text-sm max-w-lg">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">Bucket</th>
              <th className="text-right px-3 py-2">Count</th>
            </tr>
          </thead>
          <tbody>
            <BucketRow label="Current" value={a.current} />
            <BucketRow label="1–30 days" value={a.overdue30} />
            <BucketRow label="31–60 days" value={a.overdue60} />
            <BucketRow label="60+ days" value={a.overdue90} />
          </tbody>
        </table>
      </div>
    );
  }
  if (type === 'payables') {
    const a = data.aging || {};
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">A/P Aging</h2>
        <div className="text-xs text-gray-500 mb-6">Total outstanding: {fmtINR(data.totalOutstanding)}</div>
        <table className="w-full text-sm max-w-lg">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">Bucket</th>
              <th className="text-right px-3 py-2">Count</th>
            </tr>
          </thead>
          <tbody>
            <BucketRow label="Current" value={a.current} />
            <BucketRow label="1–30 days" value={a.overdue30} />
            <BucketRow label="31–60 days" value={a.overdue60} />
            <BucketRow label="60+ days" value={a.overdue90} />
          </tbody>
        </table>
      </div>
    );
  }
  if (type === 'asset-summary') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Asset Summary</h2>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <Stat label="Total Assets" value={data.totalAssets || 0} suffix="items" />
          <Stat label="Original Cost" value={fmtINR(data.totalOriginalCost)} />
          <Stat label="Depreciation" value={fmtINR(data.totalDepreciation)} />
          <Stat label="Book Value" value={fmtINR(data.totalBookValue)} />
        </div>
        {data.byCategory && Object.keys(data.byCategory).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">By Category</h3>
            <table className="text-sm max-w-md">
              <tbody>
                {Object.entries(data.byCategory).map(([k, v]: [string, any]) => (
                  <tr key={k} className="border-t border-gray-100">
                    <td className="py-1 pr-4">{k}</td>
                    <td className="py-1 text-right font-semibold">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
  return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
}

function Row({ label, value, bold, large }: { label: string; value: number; bold?: boolean; large?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''} ${large ? 'text-lg' : 'text-sm'}`}>
      <span>{label}</span>
      <span className={value < 0 ? 'text-red-600' : ''}>{fmtINR(value)}</span>
    </div>
  );
}

function BucketRow({ label, value }: { label: string; value?: number }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-2">{label}</td>
      <td className="px-3 py-2 text-right font-semibold">{value || 0}</td>
    </tr>
  );
}

function Stat({ label, value, suffix }: { label: string; value: any; suffix?: string }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
      <div className="text-[10px] uppercase tracking-wide text-emerald-700">{label}</div>
      <div className="text-lg font-semibold text-gray-900 mt-1">
        {value} {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}
