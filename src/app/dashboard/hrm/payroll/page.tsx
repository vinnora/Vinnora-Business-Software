'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, SelectInput,
  PrimaryButton, SecondaryButton, Badge, fmtINR,
} from '../_components/ui';

type Payroll = {
  _id: string; employeeId: string; employeeName: string; period: string;
  basicSalary: number; hra: number; conveyance: number; otherAllowances: number;
  grossEarnings: number; pf: number; esi: number; tds: number;
  professionalTax: number; otherDeductions: number; totalDeductions: number;
  netPay: number; status: string; paidAt: string; createdAt: string;
};

type Employee = { _id: string; firstName: string; lastName: string };

const PAY_STATUSES = ['Draft', 'Processing', 'Processed', 'Paid', 'On Hold'];
const STATUS_TONE: Record<string, any> = { Draft: 'gray', Processing: 'blue', Processed: 'amber', Paid: 'green', 'On Hold': 'red' };

export default function PayrollPage() {
  const [items, setItems] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payroll | null>(null);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/hrm/payroll?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadEmployees = async () => {
    const data = await fetch('/api/hrm/employees').then(r => r.json());
    setEmployees(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); loadEmployees(); }, [statusFilter]);

  const emptyForm = () => ({
    employeeId: '', period: '', status: 'Draft',
    basicSalary: 0, hra: 0, conveyance: 0, otherAllowances: 0,
    pf: 0, esi: 0, tds: 0, professionalTax: 0, otherDeductions: 0,
  });

  const gross = (f: any) => (Number(f.basicSalary) || 0) + (Number(f.hra) || 0) + (Number(f.conveyance) || 0) + (Number(f.otherAllowances) || 0);
  const deductions = (f: any) => (Number(f.pf) || 0) + (Number(f.esi) || 0) + (Number(f.tds) || 0) + (Number(f.professionalTax) || 0) + (Number(f.otherDeductions) || 0);
  const net = (f: any) => gross(f) - deductions(f);

  const save = async () => {
    if (!form.employeeId || !form.period) return;
    const payload = {
      ...form,
      grossEarnings: gross(form),
      totalDeductions: deductions(form),
      netPay: net(form),
    };
    const method = editing ? 'PATCH' : 'POST';
    const body = editing ? { _id: editing._id, ...payload } : payload;
    await fetch('/api/hrm/payroll', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setOpen(false); setEditing(null); setForm(emptyForm()); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this payroll record?')) return;
    await fetch(`/api/hrm/payroll?id=${id}`, { method: 'DELETE' }); load();
  };

  return (
    <>
      <PageHeader title="Payroll" subtitle="HRM" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search..." className="px-3 py-1.5 text-sm border border-[#E8D5B7] rounded focus:border-[#8B6F47] focus:outline-none" />
          <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{PAY_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
          <PrimaryButton onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>+ New Payroll</PrimaryButton>
        </>
      } />

      <div className="p-6">
        <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
              <tr>
                <th className="text-left px-4 py-2.5">Employee</th>
                <th className="text-left px-4 py-2.5">Period</th>
                <th className="text-right px-4 py-2.5">Gross</th>
                <th className="text-right px-4 py-2.5">Deductions</th>
                <th className="text-right px-4 py-2.5">Net Pay</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8B6F47]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8B6F47]">No payroll records yet.</td></tr>
              ) : items.map(p => (
                <tr key={p._id} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                  <td className="px-4 py-2 font-medium text-[#2C2620]">{p.employeeName}</td>
                  <td className="px-4 py-2 text-[#6B5841]">{p.period}</td>
                  <td className="px-4 py-2 text-right text-[#2C2620]">{fmtINR(p.grossEarnings)}</td>
                  <td className="px-4 py-2 text-right text-red-700">{fmtINR(p.totalDeductions)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-[#2C2620]">{fmtINR(p.netPay)}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(p); setForm({ ...p }); setOpen(true); }} className="text-xs text-[#8B6F47] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(p._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Payroll' : 'New Payroll'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee" required>
            <SelectInput value={form.employeeId || ''} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Select employee...</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
            </SelectInput>
          </Field>
          <Field label="Period" required><TextInput value={form.period || ''} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="e.g. Apr 2026" /></Field>
          <Field label="Status"><SelectInput value={form.status || 'Draft'} onChange={e => setForm({ ...form, status: e.target.value })}>{PAY_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
        </div>

        <h3 className="text-sm font-semibold text-[#2C2620] mt-4 mb-2">Earnings</h3>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Basic Salary" required><TextInput type="number" value={form.basicSalary || ''} onChange={e => setForm({ ...form, basicSalary: Number(e.target.value) })} /></Field>
          <Field label="HRA"><TextInput type="number" value={form.hra || ''} onChange={e => setForm({ ...form, hra: Number(e.target.value) })} /></Field>
          <Field label="Conveyance"><TextInput type="number" value={form.conveyance || ''} onChange={e => setForm({ ...form, conveyance: Number(e.target.value) })} /></Field>
          <Field label="Other Allowances"><TextInput type="number" value={form.otherAllowances || ''} onChange={e => setForm({ ...form, otherAllowances: Number(e.target.value) })} /></Field>
        </div>

        <h3 className="text-sm font-semibold text-[#2C2620] mt-4 mb-2">Deductions</h3>
        <div className="grid grid-cols-5 gap-3">
          <Field label="PF"><TextInput type="number" value={form.pf || ''} onChange={e => setForm({ ...form, pf: Number(e.target.value) })} /></Field>
          <Field label="ESI"><TextInput type="number" value={form.esi || ''} onChange={e => setForm({ ...form, esi: Number(e.target.value) })} /></Field>
          <Field label="TDS"><TextInput type="number" value={form.tds || ''} onChange={e => setForm({ ...form, tds: Number(e.target.value) })} /></Field>
          <Field label="Professional Tax"><TextInput type="number" value={form.professionalTax || ''} onChange={e => setForm({ ...form, professionalTax: Number(e.target.value) })} /></Field>
          <Field label="Other Deductions"><TextInput type="number" value={form.otherDeductions || ''} onChange={e => setForm({ ...form, otherDeductions: Number(e.target.value) })} /></Field>
        </div>

        <div className="mt-4 p-3 bg-[#FAF1E1] border border-[#E8D5B7] rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-[#8B6F47]">Gross Earnings</div>
              <div className="text-lg font-semibold text-[#2C2620]">{fmtINR(gross(form))}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#8B6F47]">Total Deductions</div>
              <div className="text-lg font-semibold text-red-700">{fmtINR(deductions(form))}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#8B6F47]">Net Pay</div>
              <div className="text-lg font-semibold text-[#2C2620]">{fmtINR(net(form))}</div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
