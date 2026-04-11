'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Modal,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  Badge,
  fmtINR,
} from '../_components/ui';

type Transaction = {
  _id: string;
  transactionType: 'income' | 'expense' | 'transfer' | 'adjustment';
  description: string;
  amount: number;
  date: string;
  category: string;
  payee?: string;
  status: string;
  referenceNumber?: string;
  accountId: string;
};

type Account = { _id: string; accountName: string; accountNumber: string; accountType: string };

const TYPES = ['income', 'expense', 'transfer', 'adjustment'];
const STATUSES = ['draft', 'posted', 'reconciled'];

export default function TransactionsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    transactionType: 'expense',
    date: new Date().toISOString().slice(0, 10),
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/accounting/transactions?${params}`).then((r) => r.json());
    let list = Array.isArray(data) ? data : [];
    if (typeFilter) list = list.filter((t: Transaction) => t.transactionType === typeFilter);
    setItems(list);
    setLoading(false);
  };

  const loadAccounts = async () => {
    const data = await fetch('/api/accounting/chart-of-accounts').then((r) => r.json());
    setAccounts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const save = async () => {
    if (!form.description || !form.amount || !form.category || !form.accountId) return;
    await fetch('/api/accounting/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setOpen(false);
    setForm({ transactionType: 'expense', date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await fetch(`/api/accounting/transactions?id=${id}`, { method: 'DELETE' });
    load();
  };

  const totalIncome = items.filter((t) => t.transactionType === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = items.filter((t) => t.transactionType === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Core Accounting"
        count={items.length}
        actions={
          <>
            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ New Transaction</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <SummaryTile label="Income" value={fmtINR(totalIncome)} tone="green" />
          <SummaryTile label="Expenses" value={fmtINR(totalExpense)} tone="red" />
          <SummaryTile label="Net" value={fmtINR(totalIncome - totalExpense)} tone="blue" />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Description</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-left px-4 py-2.5">Account</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No transactions yet.</td></tr>
              ) : (
                items.map((t) => {
                  const acct = accounts.find((a) => a._id === t.accountId);
                  return (
                    <tr key={t._id} className="border-t border-gray-100 hover:bg-emerald-50/30">
                      <td className="px-4 py-2.5 text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 capitalize">
                        <Badge tone={
                          t.transactionType === 'income' ? 'green' :
                          t.transactionType === 'expense' ? 'red' :
                          t.transactionType === 'transfer' ? 'blue' : 'gray'
                        }>{t.transactionType}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-emerald-800">{t.description}</td>
                      <td className="px-4 py-2.5 text-gray-600">{t.category}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {acct ? `${acct.accountNumber} ${acct.accountName}` : t.accountId}
                      </td>
                      <td className="px-4 py-2.5"><Badge>{t.status}</Badge></td>
                      <td className="px-4 py-2.5 text-right font-semibold">{fmtINR(t.amount)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => remove(t._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Transaction"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" required>
            <SelectInput value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <Field label="Date" required>
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Description" required>
              <TextInput value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <Field label="Amount (₹)" required>
            <TextInput type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Category" required>
            <TextInput value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Account" required>
            <SelectInput value={form.accountId || ''} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">— Select account —</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.accountNumber} — {a.accountName}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Counter Account">
            <SelectInput value={form.counterAccountId || ''} onChange={(e) => setForm({ ...form, counterAccountId: e.target.value })}>
              <option value="">— None —</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.accountNumber} — {a.accountName}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Payee">
            <TextInput value={form.payee || ''} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
          </Field>
          <Field label="Reference #">
            <TextInput value={form.referenceNumber || ''} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Notes">
              <TextArea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'blue' }) {
  const tones: Record<string, string> = {
    green: 'border-l-emerald-500',
    red: 'border-l-red-500',
    blue: 'border-l-blue-500',
  };
  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${tones[tone]} rounded-lg p-4`}>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
