'use client';

import { useEffect, useState } from 'react';
import { PageHeader, SelectInput, fmtINR } from '../_components/ui';

type LedgerEntry = {
  _id: string;
  date: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  referenceNumber?: string;
  runningBalance?: number;
};

type Account = { _id: string; accountName: string; accountNumber: string };

export default function GeneralLedgerPage() {
  const [items, setItems] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountFilter, setAccountFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (accountFilter) params.set('accountId', accountFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const data = await fetch(`/api/accounting/general-ledger?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadAccounts = async () => {
    const data = await fetch('/api/accounting/chart-of-accounts').then((r) => r.json());
    setAccounts(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, [accountFilter, startDate, endDate]);
  useEffect(() => { loadAccounts(); }, []);

  const totalDebit = items.reduce((s, e) => s + e.debit, 0);
  const totalCredit = items.reduce((s, e) => s + e.credit, 0);

  return (
    <>
      <PageHeader
        title="General Ledger"
        subtitle="Core Accounting"
        count={items.length}
        actions={
          <>
            <SelectInput value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>{a.accountNumber} {a.accountName}</option>
              ))}
            </SelectInput>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded" />
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Total Debit" value={fmtINR(totalDebit)} />
          <Tile label="Total Credit" value={fmtINR(totalCredit)} />
          <Tile label="Net" value={fmtINR(totalDebit - totalCredit)} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Account</th>
                <th className="text-left px-4 py-2.5">Description</th>
                <th className="text-left px-4 py-2.5">Reference</th>
                <th className="text-right px-4 py-2.5">Debit</th>
                <th className="text-right px-4 py-2.5">Credit</th>
                <th className="text-right px-4 py-2.5">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No ledger entries.</td></tr>
              ) : items.map((e) => {
                const acct = accounts.find((a) => a._id === e.accountId);
                return (
                  <tr key={e._id} className="border-t border-gray-100 hover:bg-emerald-50/30">
                    <td className="px-4 py-2 text-gray-600">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{acct ? `${acct.accountNumber} ${acct.accountName}` : e.accountId}</td>
                    <td className="px-4 py-2 font-medium">{e.description}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{e.referenceNumber || '—'}</td>
                    <td className="px-4 py-2 text-right">{e.debit > 0 ? fmtINR(e.debit) : '—'}</td>
                    <td className="px-4 py-2 text-right">{e.credit > 0 ? fmtINR(e.credit) : '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtINR(e.runningBalance || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 border-l-4 border-l-emerald-500 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
