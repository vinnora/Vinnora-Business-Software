'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';

type Task = { taskId: string; title: string; assignee: string; status: string; dueDate: string };

type Onboarding = {
  _id: string; employeeId: string; employeeName: string; type: string; status: string;
  startDate: string; completedDate: string; tasks: Task[]; notes: string; createdAt: string;
};

type Employee = { _id: string; firstName: string; lastName: string };

const OB_TYPES = ['Onboarding', 'Offboarding'];
const OB_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Cancelled'];
const STATUS_TONE: Record<string, any> = { 'Not Started': 'gray', 'In Progress': 'blue', Completed: 'green', Cancelled: 'red' };
const TASK_STATUSES = ['Pending', 'In Progress', 'Done'];

export default function OnboardingPage() {
  const [items, setItems] = useState<Onboarding[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Onboarding | null>(null);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/hrm/onboarding?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadEmployees = async () => {
    const data = await fetch('/api/hrm/employees').then(r => r.json());
    setEmployees(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); loadEmployees(); }, [statusFilter]);

  const emptyForm = () => ({
    employeeId: '', type: 'Onboarding', status: 'Not Started', startDate: '', notes: '', tasks: [] as Task[],
  });

  const save = async () => {
    if (!form.employeeId || !form.startDate) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    const res = await fetch('/api/hrm/onboarding', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.error || 'Could not save'); return; }
    setOpen(false); setEditing(null); setForm(emptyForm()); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    const res = await fetch(`/api/hrm/onboarding?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.error || 'Could not delete'); }
    load();
  };

  const addTask = () => {
    setForm({ ...form, tasks: [...(form.tasks || []), { taskId: `t-${Date.now()}`, title: '', assignee: '', status: 'Pending', dueDate: '' }] });
  };

  const updateTask = (i: number, patch: any) => {
    setForm({ ...form, tasks: form.tasks.map((t: any, idx: number) => idx === i ? { ...t, ...patch } : t) });
  };

  const removeTask = (i: number) => {
    setForm({ ...form, tasks: form.tasks.filter((_: any, idx: number) => idx !== i) });
  };

  const tasksDone = (tasks: Task[]) => (tasks || []).filter(t => t.status === 'Done').length;

  return (
    <>
      <PageHeader title="Onboarding / Offboarding" subtitle="HRM" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search..." className="px-3 py-1.5 text-sm border border-[#E8D5B7] rounded focus:border-[#8B6F47] focus:outline-none" />
          <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{OB_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
          <PrimaryButton onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>+ New Workflow</PrimaryButton>
        </>
      } />

      <div className="p-6">
        <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
              <tr>
                <th className="text-left px-4 py-2.5">Employee</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Start Date</th>
                <th className="text-right px-4 py-2.5">Tasks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8B6F47]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8B6F47]">No records yet.</td></tr>
              ) : items.map(ob => (
                <tr key={ob._id} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                  <td className="px-4 py-2 font-medium text-[#2C2620]">{ob.employeeName}</td>
                  <td className="px-4 py-2"><Badge tone={ob.type === 'Onboarding' ? 'green' : 'amber'}>{ob.type}</Badge></td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[ob.status]}>{ob.status}</Badge></td>
                  <td className="px-4 py-2 text-xs text-[#8B6F47]">{ob.startDate ? new Date(ob.startDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-right text-[#6B5841]">{tasksDone(ob.tasks)}/{(ob.tasks || []).length} done</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(ob); setForm({ ...ob, startDate: ob.startDate ? ob.startDate.slice(0, 10) : '', tasks: ob.tasks || [] }); setOpen(true); }} className="text-xs text-[#8B6F47] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(ob._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Workflow' : 'New Workflow'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee" required>
            <SelectInput value={form.employeeId || ''} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Select employee...</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
            </SelectInput>
          </Field>
          <Field label="Type" required><SelectInput value={form.type || 'Onboarding'} onChange={e => setForm({ ...form, type: e.target.value })}>{OB_TYPES.map(t => <option key={t}>{t}</option>)}</SelectInput></Field>
          <Field label="Status"><SelectInput value={form.status || 'Not Started'} onChange={e => setForm({ ...form, status: e.target.value })}>{OB_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="Start Date" required><TextInput type="date" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></Field>
        </div>
        <Field label="Notes"><TextArea rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#2C2620]">Tasks ({(form.tasks || []).length})</h3>
          <button type="button" onClick={addTask} className="text-xs text-[#8B6F47]">+ Add task</button>
        </div>
        {(form.tasks || []).map((t: any, i: number) => (
          <div key={t.taskId} className="border border-[#E8D5B7] rounded p-3 mb-2">
            <div className="flex gap-2 mb-2">
              <span className="text-xs text-[#8B6F47] mt-2">#{i + 1}</span>
              <div className="flex-1">
                <TextInput value={t.title} onChange={e => updateTask(i, { title: e.target.value })} placeholder="Task title" />
              </div>
              <button type="button" onClick={() => removeTask(i)} className="text-red-600 text-xs">x</button>
            </div>
            <div className="flex gap-2 ml-6">
              <div className="flex-1">
                <TextInput value={t.assignee} onChange={e => updateTask(i, { assignee: e.target.value })} placeholder="Assignee" />
              </div>
              <SelectInput value={t.status} onChange={e => updateTask(i, { status: e.target.value })} style={{ width: 130 }}>
                {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
              </SelectInput>
              <TextInput type="date" value={t.dueDate || ''} onChange={e => updateTask(i, { dueDate: e.target.value })} style={{ width: 150 }} />
            </div>
          </div>
        ))}
      </Modal>
    </>
  );
}
