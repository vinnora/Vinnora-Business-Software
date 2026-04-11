'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Modal,
  Field,
  TextInput,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  fmtINR,
} from '../_components/ui';

type LineItem = { description: string; quantity: number; unitPrice: number; amount: number };
type Bill = {
  _id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  email?: string;
  billDate: string;
  dueDate: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  status: string;
};

const STATUSES = ['draft', 'received', 'partial', 'paid', 'overdue', 'cancelled'];

export default function BillsPage() {
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    lineItems: [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
    tax: 0,
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/accounting/bills?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateLine = (i: number, patch: Partial<LineItem>) => {
    const lines = form.lineItems.map((l: LineItem, idx: number) => {
      if (idx !== i) return l;
      const merged = { ...l, ...patch };
      merged.amount = (merged.quantity || 0) * (merged.unitPrice || 0);
      return merged;
    });
    setForm({ ...form, lineItems: lines });
  };
  const addLine = () => setForm({ ...form, lineItems: [...form.lineItems, { description: '', quantity: 1, unitPrice: 0, amount: 0 }] });
  const removeLine = (i: number) => setForm({ ...form, lineItems: form.lineItems.filter((_: any, idx: number) => idx !== i) });

  const subtotal = form.lineItems.reduce((s: number, l: LineItem) => s + l.amount, 0);
  const total = subtotal + (Number(form.tax) || 0);

  const save = async () => {
    if (!form.vendorName) return;
    await fetch('/api/accounting/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        vendorId: form.vendorId || `VEND-${Date.now()}`,
        tax: Number(form.tax) || 0,
      }),
    });
    setOpen(false);
    setForm({
      billDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
      tax: 0,
    });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/accounting/bills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this bill?')) return;
    await fetch(`/api/accounting/bills?id=${id}`, { method: 'DELETE' });
    load();
  };

  const totalDue = items.reduce((s, i) => s + (i.amountDue || 0), 0);
  const totalPaid = items.reduce((s, i) => s + (i.amountPaid || 0), 0);

  return (
    <>
      <PageHeader
        title="Bills"
        subtitle="Accounts Payable"
        count={items.length}
        actions={
          <>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ New Bill</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="To Pay" value={fmtINR(totalDue)} />
          <Tile label="Paid" value={fmtINR(totalPaid)} />
          <Tile label="Total Billed" value={fmtINR(items.reduce((s, i) => s + i.total, 0))} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Bill #</th>
                <th className="text-left px-4 py-2.5">Vendor</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Due</th>
                <th className="text-right px-4 py-2.5">Total</th>
                <th className="text-right px-4 py-2.5">Due</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No bills yet.</td></tr>
              ) : items.map((b) => (
                <tr key={b._id} className="border-t border-gray-100 hover:bg-amber-50/30">
                  <td className="px-4 py-2.5 font-mono text-xs">{b.billNumber}</td>
                  <td className="px-4 py-2.5 font-medium text-amber-900">{b.vendorName}</td>
                  <td className="px-4 py-2.5 text-gray-600">{new Date(b.billDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-gray-600">{new Date(b.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right">{fmtINR(b.total)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{fmtINR(b.amountDue)}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={b.status}
                      onChange={(e) => updateStatus(b._id, e.target.value)}
                      className="text-xs border-0 rounded px-1 py-0.5 bg-white"
                    >
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => remove(b._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Bill"
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor Name" required>
            <TextInput value={form.vendorName || ''} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Bill Date">
            <TextInput type="date" value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} />
          </Field>
          <Field label="Due Date">
            <TextInput type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="PO Number">
            <TextInput value={form.purchaseOrderNumber || ''} onChange={(e) => setForm({ ...form, purchaseOrderNumber: e.target.value })} />
          </Field>
        </div>

        <div className="mt-3 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Line Items</h3>
          <button onClick={addLine} className="text-xs text-emerald-700">+ Add line</button>
        </div>
        {form.lineItems.map((l: LineItem, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2">
            <input placeholder="Description" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} className="col-span-5 px-2 py-1 text-sm border border-gray-300 rounded" />
            <input type="number" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="col-span-2 px-2 py-1 text-sm border border-gray-300 rounded" />
            <input type="number" placeholder="Price" value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} className="col-span-2 px-2 py-1 text-sm border border-gray-300 rounded" />
            <div className="col-span-2 px-2 py-1 text-sm text-right">{fmtINR(l.amount)}</div>
            <button onClick={() => removeLine(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Tax (₹)">
            <TextInput type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
          </Field>
          <div className="text-right pt-4">
            <div className="text-xs text-gray-500">Subtotal: {fmtINR(subtotal)}</div>
            <div className="text-lg font-semibold">Total: {fmtINR(total)}</div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 border-l-4 border-l-amber-500 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
