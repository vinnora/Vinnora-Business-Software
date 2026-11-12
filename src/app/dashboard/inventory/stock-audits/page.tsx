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
  fmtINR,
  apiOk,
} from '../_components/ui';

type Audit = {
  _id: string;
  auditNumber: string;
  warehouseId: string;
  warehouseName: string;
  type: string;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  status: string;
  lines: any[];
  totalItemsAudited: number;
  itemsWithVariance: number;
  totalVarianceValue: number;
  conductedBy?: string;
  notes?: string;
};

const TYPES = ['full', 'partial', 'category', 'cycle', 'spot'];
const STATUSES = ['draft', 'in-progress', 'completed', 'cancelled'];
const STATUS_TONE: Record<string, any> = {
  draft: 'gray',
  'in-progress': 'amber',
  completed: 'green',
  cancelled: 'red',
};

export default function StockAuditsPage() {
  const [items, setItems] = useState<Audit[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);
  const [selected, setSelected] = useState<Audit | null>(null);
  const [form, setForm] = useState<any>({ type: 'full', scheduledDate: new Date().toISOString().slice(0, 10) });
  const [counts, setCounts] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/inventory/stock-audits').then((r) => r.json());
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
    const res = await fetch('/api/inventory/stock-audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, warehouseName: wh?.name }),
    });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setForm({ type: 'full', scheduledDate: new Date().toISOString().slice(0, 10) });
    load();
  };

  const startCount = (audit: Audit) => {
    setSelected(audit);
    setCounts(audit.lines.map((l) => ({ ...l })));
    setCountOpen(true);
  };

  const updateCount = (i: number, qty: number) => {
    setCounts(counts.map((c, idx) => (idx === i ? { ...c, countedQuantity: qty } : c)));
  };

  const saveCount = async () => {
    if (!selected) return;
    const res = await fetch('/api/inventory/stock-audits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: selected._id, lines: counts, status: 'in-progress' }),
    });
    if (!(await apiOk(res))) return;
    setCountOpen(false);
    load();
  };

  const reconcile = async (id: string) => {
    if (!confirm('Reconcile audit and apply variances to actual stock?')) return;
    const res = await fetch('/api/inventory/stock-audits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, action: 'reconcile' }),
    });
    if (!(await apiOk(res))) return;
    setCountOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this audit?')) return;
    const res = await fetch(`/api/inventory/stock-audits?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  return (
    <>
      <PageHeader
        title="Stock Audits"
        subtitle="Verification &amp; Reconciliation"
        count={items.length}
        actions={<PrimaryButton onClick={() => setOpen(true)}>+ New Audit</PrimaryButton>}
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Total Audits" value={items.length} tone="fire" />
          <Tile
            label="Items with Variance"
            value={items.reduce((s, a) => s + a.itemsWithVariance, 0)}
            tone="amber"
          />
          <Tile
            label="Total Variance"
            value={fmtINR(items.reduce((s, a) => s + a.totalVarianceValue, 0))}
            tone="red"
          />
        </div>

        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
              <tr>
                <th className="text-left px-4 py-2.5">Audit #</th>
                <th className="text-left px-4 py-2.5">Warehouse</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Scheduled</th>
                <th className="text-right px-4 py-2.5">Items</th>
                <th className="text-right px-4 py-2.5">Variances</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#A0522D]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#A0522D]">No audits yet.</td></tr>
              ) : items.map((a) => (
                <tr key={a._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                  <td className="px-4 py-2 font-mono text-xs">{a.auditNumber}</td>
                  <td className="px-4 py-2 font-medium text-[#4A1D0F]">{a.warehouseName}</td>
                  <td className="px-4 py-2"><Badge tone="fire">{a.type}</Badge></td>
                  <td className="px-4 py-2 text-[#6B2410]">{new Date(a.scheduledDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">{a.totalItemsAudited}</td>
                  <td className="px-4 py-2 text-right">
                    {a.itemsWithVariance > 0 ? (
                      <span className="text-red-600 font-semibold">{a.itemsWithVariance}</span>
                    ) : (
                      <span className="text-[#6B2410]">{a.itemsWithVariance}</span>
                    )}
                  </td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {a.status !== 'completed' && (
                      <button onClick={() => startCount(a)} className="text-xs text-[#E2671A] hover:underline mr-2">
                        Count
                      </button>
                    )}
                    <button onClick={() => remove(a._id)} className="text-xs text-red-600 hover:underline">
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
        title="New Stock Audit"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={create}>Create &amp; Auto-populate</PrimaryButton>
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
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <Field label="Scheduled Date">
            <TextInput type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Conducted By">
          <TextInput value={form.conductedBy || ''} onChange={(e) => setForm({ ...form, conductedBy: e.target.value })} />
        </Field>
        <div className="text-xs text-[#A0522D] mt-3">
          The audit will be auto-populated with all items currently in this warehouse.
        </div>
      </Modal>

      <Modal
        open={countOpen}
        onClose={() => setCountOpen(false)}
        title={`Count: ${selected?.auditNumber || ''}`}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setCountOpen(false)}>Close</SecondaryButton>
            <SecondaryButton onClick={saveCount}>Save Counts</SecondaryButton>
            {selected && selected.status !== 'completed' && (
              <PrimaryButton onClick={() => reconcile(selected._id)}>Reconcile &amp; Apply</PrimaryButton>
            )}
          </>
        }
      >
        <div className="text-xs text-[#A0522D] mb-2">
          Enter physical counts. Variances will be highlighted.
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410] sticky top-0">
              <tr>
                <th className="text-left px-3 py-2">Item</th>
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
