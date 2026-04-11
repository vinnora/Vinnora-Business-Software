'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, TextArea, SelectInput } from '../_components/Modal';

type Opportunity = {
  _id: string;
  name: string;
  accountName?: string;
  accountId?: string;
  amount: number;
  stage: string;
  probability: number;
  closeDate: string;
  ownerName?: string;
  nextStep?: string;
};

type Account = { _id: string; name: string };

const STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

const STAGE_COLORS: Record<string, string> = {
  Prospecting: 'border-t-gray-400',
  Qualification: 'border-t-blue-400',
  'Needs Analysis': 'border-t-cyan-400',
  'Value Proposition': 'border-t-indigo-400',
  Proposal: 'border-t-violet-500',
  Negotiation: 'border-t-amber-500',
  'Closed Won': 'border-t-green-500',
  'Closed Lost': 'border-t-red-500',
};

const fmtINR = (n = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Opportunity>>({ stage: 'Prospecting', amount: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/sales-service/opportunities').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadAccounts = async () => {
    const data = await fetch('/api/sales-service/accounts').then((r) => r.json());
    setAccounts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
    loadAccounts();
  }, []);

  const save = async () => {
    if (!form.name || !form.closeDate) return;
    const accountName = accounts.find((a) => a._id === form.accountId)?.name;
    await fetch('/api/sales-service/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, accountName }),
    });
    setOpen(false);
    setForm({ stage: 'Prospecting', amount: 0 });
    load();
  };

  const moveStage = async (id: string, stage: string) => {
    setItems((prev) => prev.map((o) => (o._id === id ? { ...o, stage } : o)));
    await fetch('/api/sales-service/opportunities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, stage }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this opportunity?')) return;
    await fetch(`/api/sales-service/opportunities?id=${id}`, { method: 'DELETE' });
    load();
  };

  const totalValue = items
    .filter((o) => !['Closed Won', 'Closed Lost'].includes(o.stage))
    .reduce((s, o) => s + o.amount, 0);

  return (
    <>
      <PageHeader
        title="Opportunities"
        subtitle="Sales Pipeline"
        count={items.length}
        actions={
          <>
            <div className="hidden md:flex text-xs text-gray-600 mr-2">
              Open pipeline: <strong className="ml-1 text-gray-900">{fmtINR(totalValue)}</strong>
            </div>
            <div className="border border-gray-300 rounded overflow-hidden flex text-sm">
              <button
                onClick={() => setView('kanban')}
                className={`px-3 py-1.5 ${view === 'kanban' ? 'bg-[#0176d3] text-white' : 'bg-white'}`}
              >
                Kanban
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 ${view === 'list' ? 'bg-[#0176d3] text-white' : 'bg-white'}`}
              >
                List
              </button>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
            >
              + New
            </button>
          </>
        }
      />

      {view === 'kanban' ? (
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageItems = items.filter((o) => o.stage === stage);
              const stageTotal = stageItems.reduce((s, o) => s + o.amount, 0);
              return (
                <div
                  key={stage}
                  className={`w-64 bg-[#f3f3f3] rounded border-t-4 ${STAGE_COLORS[stage]}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => draggingId && moveStage(draggingId, stage)}
                >
                  <div className="px-3 py-2 border-b border-gray-200">
                    <div className="text-xs uppercase tracking-wide text-gray-600 font-semibold">{stage}</div>
                    <div className="text-xs text-gray-500">
                      {stageItems.length} • {fmtINR(stageTotal)}
                    </div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {stageItems.map((o) => (
                      <div
                        key={o._id}
                        draggable
                        onDragStart={() => setDraggingId(o._id)}
                        onDragEnd={() => setDraggingId(null)}
                        className="bg-white rounded shadow-sm border border-gray-200 p-3 cursor-move hover:shadow-md transition"
                      >
                        <div className="text-sm font-medium text-[#0176d3] truncate">{o.name}</div>
                        <div className="text-xs text-gray-500 truncate">{o.accountName || '—'}</div>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="font-semibold text-gray-900">{fmtINR(o.amount)}</span>
                          <span className="text-gray-500">{o.probability}%</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          Close {new Date(o.closeDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    {stageItems.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-4">Drop here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">Account</th>
                  <th className="text-left px-4 py-2.5">Stage</th>
                  <th className="text-right px-4 py-2.5">Amount</th>
                  <th className="text-right px-4 py-2.5">Prob</th>
                  <th className="text-left px-4 py-2.5">Close Date</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No opportunities yet.</td>
                  </tr>
                ) : (
                  items.map((o) => (
                    <tr key={o._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                      <td className="px-4 py-2.5 font-medium text-[#0176d3]">{o.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{o.accountName || '—'}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={o.stage}
                          onChange={(e) => moveStage(o._id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                        >
                          {STAGES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-right">{fmtINR(o.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{o.probability}%</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {new Date(o.closeDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => remove(o._id)} className="text-xs text-red-600 hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Opportunity"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded">
              Cancel
            </button>
            <button onClick={save} className="px-3 py-1.5 text-sm bg-[#0176d3] text-white rounded">
              Save
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opportunity Name" required>
            <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Account">
            <SelectInput value={form.accountId || ''} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">— None —</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Amount (₹)" required>
            <TextInput
              type="number"
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Stage">
            <SelectInput value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Close Date" required>
            <TextInput
              type="date"
              value={form.closeDate || ''}
              onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
            />
          </Field>
          <Field label="Next Step">
            <TextInput value={form.nextStep || ''} onChange={(e) => setForm({ ...form, nextStep: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
