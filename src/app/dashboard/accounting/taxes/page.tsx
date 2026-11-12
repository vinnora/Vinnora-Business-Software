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
  apiOk,
} from '../_components/ui';

type Tax = {
  _id: string;
  taxType: string;
  taxRate: number;
  jurisdiction: string;
  applicableFrom: string;
  applicableTo?: string;
  taxCode?: string;
  description?: string;
  status: string;
};

const TYPES = ['gst', 'vat', 'sales-tax', 'income-tax', 'tds'];
const TYPE_TONE: Record<string, any> = {
  gst: 'green',
  vat: 'blue',
  'sales-tax': 'amber',
  'income-tax': 'red',
  tds: 'purple',
};

export default function TaxesPage() {
  const [items, setItems] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    taxType: 'gst',
    jurisdiction: 'India',
    applicableFrom: new Date().toISOString().slice(0, 10),
  });
  const [calcAmount, setCalcAmount] = useState('');
  const [calcRate, setCalcRate] = useState('18');

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set('taxType', typeFilter);
    const data = await fetch(`/api/accounting/taxes?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [typeFilter]);

  const save = async () => {
    if (!form.taxType || form.taxRate === undefined || !form.jurisdiction) return;
    const res = await fetch('/api/accounting/taxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, taxRate: Number(form.taxRate) }),
    });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setForm({ taxType: 'gst', jurisdiction: 'India', applicableFrom: new Date().toISOString().slice(0, 10) });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this tax config?')) return;
    const res = await fetch(`/api/accounting/taxes?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  const calcAmt = Number(calcAmount) || 0;
  const calcR = Number(calcRate) || 0;
  const taxAmount = (calcAmt * calcR) / 100;
  const totalWithTax = calcAmt + taxAmount;

  return (
    <>
      <PageHeader
        title="Tax Management"
        subtitle="Compliance"
        count={items.length}
        actions={
          <>
            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ New Tax Config</PrimaryButton>
          </>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Code</th>
                <th className="text-right px-4 py-2.5">Rate</th>
                <th className="text-left px-4 py-2.5">Jurisdiction</th>
                <th className="text-left px-4 py-2.5">From</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No tax configurations yet.</td></tr>
              ) : items.map((t) => (
                <tr key={t._id} className="border-t border-gray-100 hover:bg-emerald-50/30">
                  <td className="px-4 py-2"><Badge tone={TYPE_TONE[t.taxType]}>{t.taxType.toUpperCase()}</Badge></td>
                  <td className="px-4 py-2 font-mono text-xs">{t.taxCode || '—'}</td>
                  <td className="px-4 py-2 text-right font-semibold">{t.taxRate}%</td>
                  <td className="px-4 py-2 text-gray-600">{t.jurisdiction}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{new Date(t.applicableFrom).toLocaleDateString()}</td>
                  <td className="px-4 py-2"><Badge tone={t.status === 'active' ? 'green' : 'gray'}>{t.status}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(t._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 h-fit">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Tax Calculator</h3>
          <Field label="Base Amount (₹)">
            <TextInput type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} />
          </Field>
          <Field label="Tax Rate (%)">
            <TextInput type="number" value={calcRate} onChange={(e) => setCalcRate(e.target.value)} />
          </Field>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Base</span><span>₹{calcAmt.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Tax @ {calcR}%</span><span>₹{taxAmount.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between font-semibold pt-1 border-t border-emerald-200"><span>Total</span><span>₹{totalWithTax.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Tax Configuration"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tax Type" required>
            <SelectInput value={form.taxType} onChange={(e) => setForm({ ...form, taxType: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <Field label="Tax Rate (%)" required>
            <TextInput type="number" value={form.taxRate || ''} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
          </Field>
          <Field label="Jurisdiction" required>
            <TextInput value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} />
          </Field>
          <Field label="Tax Code">
            <TextInput value={form.taxCode || ''} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} />
          </Field>
          <Field label="Applicable From" required>
            <TextInput type="date" value={form.applicableFrom} onChange={(e) => setForm({ ...form, applicableFrom: e.target.value })} />
          </Field>
          <Field label="Applicable To">
            <TextInput type="date" value={form.applicableTo || ''} onChange={(e) => setForm({ ...form, applicableTo: e.target.value })} />
          </Field>
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
