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

type BudgetItem = { category: string; budgetAmount: number; actualAmount: number; forecast?: number };
type Budget = {
  _id: string;
  budgetName: string;
  fiscalYear: string;
  department?: string;
  budgetItems: BudgetItem[];
  totalBudget: number;
  totalActual: number;
  totalForecast?: number;
  status: string;
};

const STATUSES = ['draft', 'approved', 'active', 'closed'];
const STATUS_TONE: Record<string, any> = {
  draft: 'gray',
  approved: 'blue',
  active: 'green',
  closed: 'purple',
};

export default function BudgetsPage() {
  const [items, setItems] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    fiscalYear: String(new Date().getFullYear()),
    budgetItems: [{ category: '', budgetAmount: 0, actualAmount: 0 }],
  });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/accounting/budgets').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addItem = () =>
    setForm({ ...form, budgetItems: [...form.budgetItems, { category: '', budgetAmount: 0, actualAmount: 0 }] });
  const updateItem = (i: number, patch: Partial<BudgetItem>) =>
    setForm({
      ...form,
      budgetItems: form.budgetItems.map((b: BudgetItem, idx: number) =>
        idx === i ? { ...b, ...patch } : b
      ),
    });
  const removeItem = (i: number) =>
    setForm({ ...form, budgetItems: form.budgetItems.filter((_: any, idx: number) => idx !== i) });

  const save = async () => {
    if (!form.budgetName || !form.fiscalYear) return;
    const res = await fetch('/api/accounting/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        budgetItems: form.budgetItems.map((b: BudgetItem) => ({
          ...b,
          budgetAmount: Number(b.budgetAmount),
          actualAmount: Number(b.actualAmount),
        })),
      }),
    });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setForm({
      fiscalYear: String(new Date().getFullYear()),
      budgetItems: [{ category: '', budgetAmount: 0, actualAmount: 0 }],
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    const res = await fetch(`/api/accounting/budgets?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  return (
    <>
      <PageHeader
        title="Budgets &amp; Forecasting"
        subtitle="Planning"
        count={items.length}
        actions={<PrimaryButton onClick={() => setOpen(true)}>+ New Budget</PrimaryButton>}
      />

      <div className="p-6 space-y-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="bg-white border rounded p-8 text-center text-gray-500">
            No budgets yet. Create one to start planning.
          </div>
        ) : (
          items.map((b) => {
            const variance = b.totalActual - b.totalBudget;
            const variancePct = b.totalBudget > 0 ? (variance / b.totalBudget) * 100 : 0;
            const utilization = b.totalBudget > 0 ? Math.min(100, (b.totalActual / b.totalBudget) * 100) : 0;
            return (
              <div key={b._id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-emerald-900">{b.budgetName}</h3>
                      <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      FY {b.fiscalYear}{b.department ? ` • ${b.department}` : ''}
                    </div>
                  </div>
                  <button onClick={() => remove(b._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Budgeted</div>
                    <div className="font-semibold">{fmtINR(b.totalBudget)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Actual</div>
                    <div className="font-semibold">{fmtINR(b.totalActual)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Variance</div>
                    <div className={`font-semibold ${variance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {fmtINR(variance)} ({variancePct.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="bg-gray-100 rounded h-2">
                  <div
                    className={`h-2 rounded ${utilization >= 100 ? 'bg-red-500' : utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-500 mt-1">{utilization.toFixed(0)}% utilized</div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Budget"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget Name" required>
            <TextInput value={form.budgetName || ''} onChange={(e) => setForm({ ...form, budgetName: e.target.value })} />
          </Field>
          <Field label="Fiscal Year" required>
            <TextInput value={form.fiscalYear} onChange={(e) => setForm({ ...form, fiscalYear: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Department">
              <TextInput value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="mt-3 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Budget Items</h3>
          <button onClick={addItem} className="text-xs text-emerald-700">+ Add line</button>
        </div>
        {form.budgetItems.map((b: BudgetItem, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2">
            <input
              placeholder="Category"
              value={b.category}
              onChange={(e) => updateItem(i, { category: e.target.value })}
              className="col-span-6 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <input
              type="number"
              placeholder="Budget"
              value={b.budgetAmount}
              onChange={(e) => updateItem(i, { budgetAmount: Number(e.target.value) })}
              className="col-span-3 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <input
              type="number"
              placeholder="Actual"
              value={b.actualAmount}
              onChange={(e) => updateItem(i, { actualAmount: Number(e.target.value) })}
              className="col-span-2 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <button onClick={() => removeItem(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}
      </Modal>
    </>
  );
}
