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
  Badge,
  Tile,
  apiOk,
} from '../_components/ui';

type CC = {
  _id: string;
  countNumber: string;
  warehouseName: string;
  scheduledDate: string;
  completedAt?: string;
  status: string;
  abcClassFilter?: string;
  categoryFilter?: string;
  lines: any[];
  itemsCounted: number;
  itemsWithVariance: number;
};

const STATUSES = ['scheduled', 'in-progress', 'completed', 'skipped'];
const STATUS_TONE: Record<string, any> = {
  scheduled: 'gray',
  'in-progress': 'amber',
  completed: 'green',
  skipped: 'red',
};

export default function CycleCountsPage() {
  const [items, setItems] = useState<CC[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);
  const [selected, setSelected] = useState<CC | null>(null);
  const [counts, setCounts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ scheduledDate: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/inventory/cycle-counts').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch('/api/inventory/warehouses')
      .then((r) => r.json())
      .then((d) => setWarehouses(Array.isArray(d) ? d : []));
  }, []);

  const create = async () => {
    if (!form.warehouseId) return;
    const wh = warehouses.find((w) => w._id === form.warehouseId);
    const res = await fetch('/api/inventory/cycle-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, warehouseName: wh?.name }),
    });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setForm({ scheduledDate: new Date().toISOString().slice(0, 10) });
    load();
  };

  const startCount = (cc: CC) => {
    setSelected(cc);
    setCounts(cc.lines.map((l) => ({ ...l })));
    setCountOpen(true);
  };

  const updateCount = (i: number, qty: number) => {
    setCounts(counts.map((c, idx) => (idx === i ? { ...c, countedQuantity: qty } : c)));
  };

  const saveCount = async () => {
    if (!selected) return;
    const res = await fetch('/api/inventory/cycle-counts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: selected._id, lines: counts, status: 'in-progress' }),
    });
    if (!(await apiOk(res))) return;
    setCountOpen(false);
    load();
  };

  const reconcile = async (id: string) => {
    if (!confirm('Reconcile and apply variances to actual stock?')) return;
    const res = await fetch('/api/inventory/cycle-counts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, action: 'reconcile' }),
    });
    if (!(await apiOk(res))) return;
    setCountOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete?')) return;
    const res = await fetch(`/api/inventory/cycle-counts?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  return (
    <>
      <PageHeader
        title="Cycle Counts"
        subtitle="Continuous Stock Verification"
        count={items.length}
        actions={<PrimaryButton onClick={() => setOpen(true)}>+ New Cycle Count</PrimaryButton>}
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Total Counts" value={items.length} tone="fire" />
          <Tile
            label="Scheduled"
            value={items.filter((i) => i.status === 'scheduled').length}
            tone="amber"
          />
          <Tile
            label="Completed"
            value={items.filter((i) => i.status === 'completed').length}
            tone="glow"
          />
        </div>

        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
              <tr>
                <th className="text-left px-4 py-2.5">Count #</th>
                <th className="text-left px-4 py-2.5">Warehouse</th>
                <th className="text-left px-4 py-2.5">Scheduled</th>
                <th className="text-left px-4 py-2.5">Filter</th>
                <th className="text-right px-4 py-2.5">Items</th>
                <th className="text-right px-4 py-2.5">Counted</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#A0522D]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#A0522D]">No cycle counts yet.</td></tr>
              ) : items.map((cc) => (
                <tr key={cc._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                  <td className="px-4 py-2 font-mono text-xs">{cc.countNumber}</td>
                  <td className="px-4 py-2 font-medium text-[#4A1D0F]">{cc.warehouseName}</td>
                  <td className="px-4 py-2 text-[#6B2410]">{new Date(cc.scheduledDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    {cc.abcClassFilter && <Badge tone="amber">Class {cc.abcClassFilter}</Badge>}
                    {cc.categoryFilter && <Badge tone="fire">{cc.categoryFilter}</Badge>}
                  </td>
                  <td className="px-4 py-2 text-right">{cc.lines.length}</td>
                  <td className="px-4 py-2 text-right">{cc.itemsCounted} / {cc.lines.length}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[cc.status]}>{cc.status}</Badge></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {cc.status !== 'completed' && (
                      <button onClick={() => startCount(cc)} className="text-xs text-[#E2671A] hover:underline mr-2">
                        Count
                      </button>
                    )}
                    <button onClick={() => remove(cc._id)} className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
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
        title="New Cycle Count"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={create}>Create</PrimaryButton>
          </>
        }
      >
        <Field label="Warehouse" required>
          <SelectInput value={form.warehouseId || ''} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
            <option value="">— Warehouse —</option>
            {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
          </SelectInput>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ABC Class Filter">
            <SelectInput value={form.abcClassFilter || ''} onChange={(e) => setForm({ ...form, abcClassFilter: e.target.value })}>
              <option value="">All classes</option>
              <option value="A">Class A (high value)</option>
              <option value="B">Class B (medium value)</option>
              <option value="C">Class C (low value)</option>
            </SelectInput>
          </Field>
          <Field label="Category Filter">
            <TextInput value={form.categoryFilter || ''} onChange={(e) => setForm({ ...form, categoryFilter: e.target.value })} />
          </Field>
        </div>
        <Field label="Scheduled Date">
          <TextInput type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
        </Field>
        <Field label="Counted By">
          <TextInput value={form.countedBy || ''} onChange={(e) => setForm({ ...form, countedBy: e.target.value })} />
        </Field>
        <div className="text-xs text-[#A0522D] mt-3">
          Items will be auto-classified using Pareto (ABC). Class A: value &gt; ₹50k. Class B: ₹10k-50k. Class C: &lt; ₹10k.
        </div>
      </Modal>

      <Modal
        open={countOpen}
        onClose={() => setCountOpen(false)}
        title={`Count: ${selected?.countNumber || ''}`}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setCountOpen(false)}>Close</SecondaryButton>
            <SecondaryButton onClick={saveCount}>Save</SecondaryButton>
            {selected && selected.status !== 'completed' && (
              <PrimaryButton onClick={() => reconcile(selected._id)}>Reconcile &amp; Apply</PrimaryButton>
            )}
          </>
        }
      >
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410] sticky top-0">
              <tr>
                <th className="text-left px-3 py-2">Item</th>
                <th className="text-left px-3 py-2">Class</th>
                <th className="text-right px-3 py-2">System</th>
                <th className="text-right px-3 py-2">Counted</th>
                <th className="text-right px-3 py-2">Variance</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((line, i) => {
                const variance = (line.countedQuantity || 0) - (line.systemQuantity || 0);
                return (
                  <tr key={i} className="border-t border-[#FFF1D6]">
                    <td className="px-3 py-1.5">
                      <span className="font-mono text-xs text-[#A0522D] mr-2">{line.itemCode}</span>
                      {line.itemName}
                    </td>
                    <td className="px-3 py-1.5">
                      {line.abcClass && <Badge tone="amber">{line.abcClass}</Badge>}
                    </td>
                    <td className="px-3 py-1.5 text-right">{line.systemQuantity}</td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={line.countedQuantity || 0}
                        onChange={(e) => updateCount(i, Number(e.target.value))}
                        className="w-20 px-1 py-0.5 text-right border border-[#FFE5C4] rounded"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {variance !== 0 && (
                        <span className={variance > 0 ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>
                          {variance > 0 ? `+${variance}` : variance}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
