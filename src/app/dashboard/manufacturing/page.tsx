'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, Tile, Badge, fmtINR } from './_components/ui';

type Summary = {
  totalWorkOrders?: number;
  activeOrders?: number;
  totalMaterials?: number;
  lowStockMaterials?: number;
  totalMachines?: number;
  pendingQC?: number;
  operationalMachines?: number;
  openRequisitions?: number;
  totalSuppliers?: number;
};

type WorkOrder = {
  _id: string;
  workOrderNumber: string;
  productName: string;
  quantity: number;
  status: string;
  priority: string;
  dueDate?: string;
};

const STATUS_TONE: Record<string, any> = {
  Draft: 'gray',
  Planned: 'blue',
  'In Progress': 'amber',
  'On Hold': 'purple',
  Completed: 'green',
  Cancelled: 'red',
};

const PRIORITY_TONE: Record<string, any> = {
  Low: 'gray',
  Normal: 'blue',
  High: 'amber',
  Urgent: 'red',
};

const QUICK_LINKS = [
  { label: 'Work Orders', href: '/dashboard/manufacturing/work-orders', icon: '📋', desc: 'Manage production orders' },
  { label: 'BOM', href: '/dashboard/manufacturing/bom', icon: '📐', desc: 'Bill of Materials' },
  { label: 'Materials', href: '/dashboard/manufacturing/materials', icon: '🧱', desc: 'Raw material inventory' },
  { label: 'Quality', href: '/dashboard/manufacturing/quality', icon: '✅', desc: 'Quality inspections' },
  { label: 'Machines', href: '/dashboard/manufacturing/machines', icon: '⚙️', desc: 'Machine management' },
  { label: 'Traceability', href: '/dashboard/manufacturing/work-orders', icon: '🔍', desc: 'Track production flow' },
];

export default function ManufacturingHome() {
  const [summary, setSummary] = useState<Summary>({});
  const [activeWOs, setActiveWOs] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/manufacturing/reports?type=dashboard-summary').then((r) => r.json()),
      fetch('/api/manufacturing/work-orders?status=In+Progress').then((r) => r.json()),
    ])
      .then(([s, wo]) => {
        setSummary(s || {});
        setActiveWOs(Array.isArray(wo) ? wo : []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">Manufacturing</div>
          <h1 className="text-2xl font-semibold text-[#1C1C1E]">Production Hub</h1>
          <p className="text-sm text-[#4A4E54] mt-1">Your shop floor at a glance</p>
        </div>
        <Link
          href="/dashboard/manufacturing/work-orders"
          className="px-4 py-2 bg-gradient-to-r from-[#4A4E54] to-[#6B7280] text-white text-sm rounded hover:from-[#2C2F33] hover:to-[#4A4E54] shadow-md shadow-[#4A4E54]/30"
        >
          + New Work Order
        </Link>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Tile label="Total Work Orders" value={summary.totalWorkOrders || 0} tone="steel" />
        <Tile label="Active Orders" value={summary.activeOrders || 0} tone="gold" />
        <Tile label="Total Materials" value={summary.totalMaterials || 0} tone="copper" />
        <Tile label="Low Stock Materials" value={summary.lowStockMaterials || 0} tone="iron" />
        <Tile label="Machines" value={summary.totalMachines || 0} tone="steel" />
        <Tile label="Pending QC" value={summary.pendingQC || 0} tone="gold" />
      </div>

      {/* Highlight Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-[#4A4E54] to-[#6B7280] rounded-lg p-5 text-white">
          <div className="text-xs uppercase tracking-wide text-white/70">Operational Machines</div>
          <div className="text-3xl font-semibold mt-1">{summary.operationalMachines || 0}</div>
          <div className="text-xs text-white/60 mt-1">Currently running</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] border-l-4 border-l-[#D4A843] rounded-lg p-5">
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">Open Requisitions</div>
          <div className="text-3xl font-semibold text-[#1C1C1E] mt-1">{summary.openRequisitions || 0}</div>
          <div className="text-xs text-[#6B7280] mt-1">Pending approval</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] border-l-4 border-l-[#B87333] rounded-lg p-5">
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">Total Suppliers</div>
          <div className="text-3xl font-semibold text-[#1C1C1E] mt-1">{summary.totalSuppliers || 0}</div>
          <div className="text-xs text-[#6B7280] mt-1">Material vendors</div>
        </div>
      </div>

      {/* Active Work Orders Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
          <h2 className="text-base font-semibold text-[#1C1C1E]">Active Work Orders</h2>
          <Link href="/dashboard/manufacturing/work-orders" className="text-xs text-[#D4A843] hover:underline">
            View all →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="text-left px-4 py-2.5">WO Number</th>
              <th className="text-left px-4 py-2.5">Product</th>
              <th className="text-right px-4 py-2.5">Qty</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Priority</th>
              <th className="text-left px-4 py-2.5">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
            ) : activeWOs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">No active work orders.</td></tr>
            ) : (
              activeWOs.slice(0, 5).map((wo) => (
                <tr key={wo._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{wo.workOrderNumber}</td>
                  <td className="px-4 py-2 text-[#1C1C1E]">{wo.productName}</td>
                  <td className="px-4 py-2 text-right text-[#1C1C1E]">{wo.quantity}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[wo.status] || 'gray'}>{wo.status}</Badge></td>
                  <td className="px-4 py-2"><Badge tone={PRIORITY_TONE[wo.priority] || 'gray'}>{wo.priority}</Badge></td>
                  <td className="px-4 py-2 text-[#6B7280]">{wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Links */}
      <h2 className="text-base font-semibold text-[#1C1C1E] mb-3">Quick Links</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="bg-white border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md hover:border-[#D4A843] transition block"
          >
            <div className="text-2xl mb-2">{link.icon}</div>
            <div className="text-sm font-semibold text-[#1C1C1E]">{link.label}</div>
            <div className="text-xs text-[#6B7280] mt-1">{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
