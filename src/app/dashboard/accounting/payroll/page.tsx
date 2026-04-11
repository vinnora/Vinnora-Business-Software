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

type PayrollEntry = {
  _id: string;
  employeeId: string;
  employeeName: string;
  payrollPeriod: string;
  paymentDate: string;
  baseSalary: number;
  hra: number;
  da: number;
  grossSalary: number;
  incomeTax: number;
  providentFund: number;
  netSalary: number;
  status: string;
  panNumber?: string;
};

const STATUSES = ['draft', 'processed', 'paid', 'cancelled'];
const STATUS_TONE: Record<string, any> = {
  draft: 'gray',
  processed: 'blue',
  paid: 'green',
  cancelled: 'red',
};

export default function PayrollPage() {
  const [items, setItems] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    paymentDate: new Date().toISOString().slice(0, 10),
    payrollPeriod: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '-'),
    baseSalary: 0,
    hra: 0,
    da: 0,
    incomeTax: 0,
    providentFund: 0,
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/accounting/payroll?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [statusFilter]);

  const gross = (Number(form.baseSalary) || 0) + (Number(form.hra) || 0) + (Number(form.da) || 0);
  const net = gross - ((Number(form.incomeTax) || 0) + (Number(form.providentFund) || 0));

  const save = async () => {
    if (!form.employeeName || !form.baseSalary) return;
    await fetch('/api/accounting/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        employeeId: form.employeeId || `EMP-${Date.now()}`,
        baseSalary: Number(form.baseSalary),
        hra: Number(form.hra),
        da: Number(form.da),
        incomeTax: Number(form.incomeTax),
        providentFund: Number(form.providentFund),
      }),
    });
    setOpen(false);
    setForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      payrollPeriod: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '-'),
      baseSalary: 0,
      hra: 0,
      da: 0,
      incomeTax: 0,
      providentFund: 0,
    });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/accounting/payroll', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this payroll entry?')) return;
    await fetch(`/api/accounting/payroll?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle="Indian Compliance"
        count={items.length}
        actions={
          <>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ Run Payroll</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Gross Total" value={fmtINR(items.reduce((s, p) => s + p.grossSalary, 0))} />
          <Tile label="Deductions" value={fmtINR(items.reduce((s, p) => s + p.incomeTax + p.providentFund, 0))} />
          <Tile label="Net Payout" value={fmtINR(items.reduce((s, p) => s + p.netSalary, 0))} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Employee</th>
                <th className="text-left px-4 py-2.5">Period</th>
                <th className="text-left px-4 py-2.5">PAN</th>
                <th className="text-right px-4 py-2.5">Base</th>
                <th className="text-right px-4 py-2.5">HRA</th>
                <th className="text-right px-4 py-2.5">Gross</th>
                <th className="text-right px-4 py-2.5">Net</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No payroll entries yet.</td></tr>
              ) : items.map((p) => (
                <tr key={p._id} className="border-t border-gray-100 hover:bg-emerald-50/30">
                  <td className="px-4 py-2 font-medium text-emerald-800">{p.employeeName}</td>
                  <td className="px-4 py-2 text-gray-600">{p.payrollPeriod}</td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-500">{p.panNumber || '—'}</td>
                  <td className="px-4 py-2 text-right">{fmtINR(p.baseSalary)}</td>
                  <td className="px-4 py-2 text-right">{fmtINR(p.hra)}</td>
                  <td className="px-4 py-2 text-right">{fmtINR(p.grossSalary)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{fmtINR(p.netSalary)}</td>
                  <td className="px-4 py-2">
                    <select value={p.status} onChange={(e) => updateStatus(p._id, e.target.value)} className="text-xs border-0 rounded px-1 py-0.5 bg-white">
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(p._id)} className="text-xs text-red-600 hover:underline">Delete</button>
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
        title="Run Payroll"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee Name" required>
            <TextInput value={form.employeeName || ''} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} />
          </Field>
          <Field label="Employee ID">
            <TextInput value={form.employeeId || ''} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
          </Field>
          <Field label="Period" required>
            <TextInput value={form.payrollPeriod} onChange={(e) => setForm({ ...form, payrollPeriod: e.target.value })} />
          </Field>
          <Field label="Payment Date" required>
            <TextInput type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
          </Field>
          <Field label="Base Salary (₹)" required>
            <TextInput type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
          </Field>
          <Field label="HRA (₹)">
            <TextInput type="number" value={form.hra} onChange={(e) => setForm({ ...form, hra: e.target.value })} />
          </Field>
          <Field label="DA (₹)">
            <TextInput type="number" value={form.da} onChange={(e) => setForm({ ...form, da: e.target.value })} />
          </Field>
          <Field label="Income Tax (₹)">
            <TextInput type="number" value={form.incomeTax} onChange={(e) => setForm({ ...form, incomeTax: e.target.value })} />
          </Field>
          <Field label="PF (₹)">
            <TextInput type="number" value={form.providentFund} onChange={(e) => setForm({ ...form, providentFund: e.target.value })} />
          </Field>
          <Field label="PAN Number">
            <TextInput value={form.panNumber || ''} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
          </Field>
          <Field label="Bank Name">
            <TextInput value={form.bankName || ''} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          </Field>
          <Field label="Bank Account">
            <TextInput value={form.bankAccount || ''} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded p-3 text-sm">
          <div className="flex justify-between">
            <span>Gross Salary</span>
            <span className="font-semibold">{fmtINR(gross)}</span>
          </div>
          <div className="flex justify-between text-emerald-900 font-semibold">
            <span>Net Salary</span>
            <span>{fmtINR(net)}</span>
          </div>
        </div>
      </Modal>
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
