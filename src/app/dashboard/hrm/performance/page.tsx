'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';

type Review = {
  _id: string; employeeId: string; employeeName: string; reviewerName: string;
  period: string; type: string; status: string; overallRating: number;
  goals: string; competencies: string; selfComments: string; managerComments: string;
  createdAt: string;
};

type Employee = { _id: string; firstName: string; lastName: string };

const REVIEW_TYPES = ['Annual', 'Mid-Year', 'Quarterly', 'Probation', '360-Degree'];
const REVIEW_STATUSES = ['Draft', 'Self Review', 'Manager Review', 'Completed', 'Acknowledged'];
const STATUS_TONE: Record<string, any> = { Draft: 'gray', 'Self Review': 'blue', 'Manager Review': 'amber', Completed: 'green', Acknowledged: 'purple' };

export default function PerformancePage() {
  const [items, setItems] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/hrm/performance?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadEmployees = async () => {
    const data = await fetch('/api/hrm/employees').then(r => r.json());
    setEmployees(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); loadEmployees(); }, [statusFilter]);

  const save = async () => {
    if (!form.employeeId || !form.period) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    const res = await fetch('/api/hrm/performance', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.error || 'Could not save'); return; }
    setOpen(false); setEditing(null); setForm({}); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    const res = await fetch(`/api/hrm/performance?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.error || 'Could not delete'); }
    load();
  };

  const emptyForm = () => ({
    employeeId: '', period: '', type: 'Annual', status: 'Draft',
    overallRating: 3, selfComments: '', managerComments: '',
  });

  return (
    <>
      <PageHeader title="Performance Reviews" subtitle="HRM" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search..." className="px-3 py-1.5 text-sm border border-[#E8D5B7] rounded focus:border-[#8B6F47] focus:outline-none" />
          <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{REVIEW_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
          <PrimaryButton onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>+ New Review</PrimaryButton>
        </>
      } />

      <div className="p-6">
        <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
              <tr>
                <th className="text-left px-4 py-2.5">Employee</th>
                <th className="text-left px-4 py-2.5">Period</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Rating</th>
                <th className="text-left px-4 py-2.5">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8B6F47]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8B6F47]">No reviews yet.</td></tr>
              ) : items.map(r => (
                <tr key={r._id} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                  <td className="px-4 py-2 font-medium text-[#2C2620]">{r.employeeName}</td>
                  <td className="px-4 py-2 text-[#6B5841]">{r.period}</td>
                  <td className="px-4 py-2 text-[#6B5841]">{r.type}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                  <td className="px-4 py-2 text-right font-semibold text-[#2C2620]">{r.overallRating}/5</td>
                  <td className="px-4 py-2 text-xs text-[#8B6F47]">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(r); setForm({ ...r }); setOpen(true); }} className="text-xs text-[#8B6F47] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(r._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Review' : 'New Review'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee" required>
            <SelectInput value={form.employeeId || ''} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Select employee...</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
            </SelectInput>
          </Field>
          <Field label="Period" required><TextInput value={form.period || ''} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="e.g. FY 2025-26" /></Field>
          <Field label="Type"><SelectInput value={form.type || 'Annual'} onChange={e => setForm({ ...form, type: e.target.value })}>{REVIEW_TYPES.map(t => <option key={t}>{t}</option>)}</SelectInput></Field>
          <Field label="Status"><SelectInput value={form.status || 'Draft'} onChange={e => setForm({ ...form, status: e.target.value })}>{REVIEW_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="Overall Rating (1-5)"><TextInput type="number" min={1} max={5} value={form.overallRating || 3} onChange={e => setForm({ ...form, overallRating: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Self Comments"><TextArea rows={3} value={form.selfComments || ''} onChange={e => setForm({ ...form, selfComments: e.target.value })} /></Field>
        <Field label="Manager Comments"><TextArea rows={3} value={form.managerComments || ''} onChange={e => setForm({ ...form, managerComments: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
