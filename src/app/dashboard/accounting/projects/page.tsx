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

type Phase = { phase: string; budgetAmount: number; actualSpent: number };

type Project = {
  _id: string;
  projectName: string;
  projectCode: string;
  clientName: string;
  startDate: string;
  endDate: string;
  projectManager?: string;
  status: string;
  totalBudget: number;
  totalSpent: number;
  budget: Phase[];
};

const STATUSES = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];
const STATUS_TONE: Record<string, any> = {
  planning: 'gray',
  active: 'green',
  'on-hold': 'amber',
  completed: 'blue',
  cancelled: 'red',
};

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    budget: [{ phase: 'Phase 1', budgetAmount: 0, actualSpent: 0 }],
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/accounting/projects?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [statusFilter]);

  const addPhase = () => setForm({ ...form, budget: [...form.budget, { phase: '', budgetAmount: 0, actualSpent: 0 }] });
  const updatePhase = (i: number, patch: Partial<Phase>) =>
    setForm({ ...form, budget: form.budget.map((p: Phase, idx: number) => (idx === i ? { ...p, ...patch } : p)) });
  const removePhase = (i: number) =>
    setForm({ ...form, budget: form.budget.filter((_: any, idx: number) => idx !== i) });

  const save = async () => {
    if (!form.projectName || !form.clientName) return;
    const res = await fetch('/api/accounting/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        clientId: form.clientId || `CLI-${Date.now()}`,
        budget: form.budget.map((p: Phase) => ({
          ...p,
          budgetAmount: Number(p.budgetAmount),
          actualSpent: Number(p.actualSpent),
        })),
      }),
    });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setForm({
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      budget: [{ phase: 'Phase 1', budgetAmount: 0, actualSpent: 0 }],
    });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch('/api/accounting/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status }),
    });
    await apiOk(res);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    const res = await fetch(`/api/accounting/projects?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Project Accounting"
        count={items.length}
        actions={
          <>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ New Project</PrimaryButton>
          </>
        }
      />

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="bg-white border rounded p-8 text-center text-gray-500 col-span-2">
            No projects yet.
          </div>
        ) : items.map((p) => {
          const utilization = p.totalBudget > 0 ? Math.min(100, (p.totalSpent / p.totalBudget) * 100) : 0;
          return (
            <div key={p._id} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-emerald-900">{p.projectName}</h3>
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.projectCode} • Client: {p.clientName}
                  </div>
                </div>
                <button onClick={() => remove(p._id)} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                {new Date(p.startDate).toLocaleDateString()} → {new Date(p.endDate).toLocaleDateString()}
                {p.projectManager && ` • PM: ${p.projectManager}`}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase text-gray-500">Budget</div>
                  <div className="font-semibold">{fmtINR(p.totalBudget)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-gray-500">Spent</div>
                  <div className="font-semibold">{fmtINR(p.totalSpent)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-gray-500">Remaining</div>
                  <div className="font-semibold">{fmtINR(p.totalBudget - p.totalSpent)}</div>
                </div>
              </div>
              <div className="bg-gray-100 rounded h-2">
                <div
                  className={`h-2 rounded ${utilization >= 100 ? 'bg-red-500' : utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">{utilization.toFixed(0)}% utilized</span>
                <select
                  value={p.status}
                  onChange={(e) => updateStatus(p._id, e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-0.5 bg-white"
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Project"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project Name" required>
            <TextInput value={form.projectName || ''} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
          </Field>
          <Field label="Client Name" required>
            <TextInput value={form.clientName || ''} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </Field>
          <Field label="Start Date" required>
            <TextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="End Date" required>
            <TextInput type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
          <Field label="Project Manager">
            <TextInput value={form.projectManager || ''} onChange={(e) => setForm({ ...form, projectManager: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="mt-3 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Budget Phases</h3>
          <button onClick={addPhase} className="text-xs text-emerald-700">+ Add phase</button>
        </div>
        {form.budget.map((b: Phase, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2">
            <input
              placeholder="Phase"
              value={b.phase}
              onChange={(e) => updatePhase(i, { phase: e.target.value })}
              className="col-span-6 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <input
              type="number"
              placeholder="Budget"
              value={b.budgetAmount}
              onChange={(e) => updatePhase(i, { budgetAmount: Number(e.target.value) })}
              className="col-span-3 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <input
              type="number"
              placeholder="Spent"
              value={b.actualSpent}
              onChange={(e) => updatePhase(i, { actualSpent: Number(e.target.value) })}
              className="col-span-2 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <button onClick={() => removePhase(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}
      </Modal>
    </>
  );
}
