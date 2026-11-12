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
  apiOk,
} from '../_components/ui';

type Account = {
  _id: string;
  accountName: string;
  accountNumber: string;
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  description?: string;
  balance: number;
  status: string;
};

const TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];
const TYPE_TONE: Record<string, any> = {
  asset: 'green',
  liability: 'red',
  equity: 'purple',
  income: 'blue',
  expense: 'amber',
};

export default function ChartOfAccountsPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ accountType: 'asset' });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    const data = await fetch(`/api/accounting/chart-of-accounts?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter]);

  const save = async () => {
    if (!form.accountName || !form.accountNumber || !form.accountType) return;
    const res = await fetch('/api/accounting/chart-of-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setForm({ accountType: 'asset' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    const res = await fetch(`/api/accounting/chart-of-accounts?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  // Group by type
  const grouped = TYPES.reduce((acc: Record<string, Account[]>, type) => {
    acc[type] = items.filter((a) => a.accountType === type);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        subtitle="Core Accounting"
        count={items.length}
        actions={
          <>
            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ New Account</PrimaryButton>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="bg-white border rounded p-8 text-center text-gray-500">
            No accounts in your chart yet.
          </div>
        ) : (
          TYPES.map((type) =>
            grouped[type].length > 0 ? (
              <div key={type} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-[#f3f3f3] border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge tone={TYPE_TONE[type]}>{type}</Badge>
                    <span className="text-sm text-gray-600">{grouped[type].length} accounts</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {fmtINR(grouped[type].reduce((s, a) => s + a.balance, 0))}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {grouped[type].map((a) => (
                      <tr key={a._id} className="border-t border-gray-100 hover:bg-emerald-50/30">
                        <td className="px-4 py-2 font-mono text-xs text-gray-600 w-20">{a.accountNumber}</td>
                        <td className="px-4 py-2 font-medium text-emerald-800">{a.accountName}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{a.description || ''}</td>
                        <td className="px-4 py-2 text-right">{fmtINR(a.balance)}</td>
                        <td className="px-4 py-2 text-right w-24">
                          <button onClick={() => remove(a._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null
          )
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Account"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account Number" required>
            <TextInput value={form.accountNumber || ''} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          </Field>
          <Field label="Account Type" required>
            <SelectInput value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <div className="col-span-2">
            <Field label="Account Name" required>
              <TextInput value={form.accountName || ''} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Description">
              <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
