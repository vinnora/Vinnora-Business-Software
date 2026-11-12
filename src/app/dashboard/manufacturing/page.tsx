'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHome, HomePanel } from '@/components/platform/AppHome';
import { Badge } from './_components/ui';

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

type Tone = React.ComponentProps<typeof Badge>['tone'];

const STATUS_TONE: Record<string, Tone> = {
  Draft: 'gray',
  Planned: 'blue',
  'In Progress': 'amber',
  'On Hold': 'purple',
  Completed: 'green',
  Cancelled: 'red',
};

const PRIORITY_TONE: Record<string, Tone> = {
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppHome
      app="manufacturing"
      title="Production Hub"
      subtitle="Your shop floor at a glance."
      action={{ href: '/dashboard/manufacturing/work-orders', label: '+ New Work Order' }}
      loading={loading}
      metrics={[
        { label: 'Total Work Orders', value: summary.totalWorkOrders || 0, href: '/dashboard/manufacturing/work-orders' },
        { label: 'Active Orders', value: summary.activeOrders || 0, href: '/dashboard/manufacturing/work-orders' },
        { label: 'Total Materials', value: summary.totalMaterials || 0, href: '/dashboard/manufacturing/materials' },
        { label: 'Low Stock Materials', value: summary.lowStockMaterials || 0, href: '/dashboard/manufacturing/materials' },
        { label: 'Machines', value: summary.totalMachines || 0, href: '/dashboard/manufacturing/machines' },
        { label: 'Pending QC', value: summary.pendingQC || 0, href: '/dashboard/manufacturing/quality' },
      ]}
      highlights={[
        { label: 'Operational Machines', value: summary.operationalMachines || 0, hint: 'Currently running', emphasis: true },
        { label: 'Open Requisitions', value: summary.openRequisitions || 0, hint: 'Pending approval' },
        { label: 'Total Suppliers', value: summary.totalSuppliers || 0, hint: 'Material vendors' },
      ]}
    >
      <HomePanel title="Active Work Orders" link={{ href: '/dashboard/manufacturing/work-orders', label: 'View all' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-[var(--p-muted)]">
              <tr>
                <th className="text-left px-3 py-2">WO Number</th>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-right px-3 py-2">Qty</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Priority</th>
                <th className="text-left px-3 py-2">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[var(--p-muted)]">Loading…</td>
                </tr>
              ) : activeWOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[var(--p-muted)]">No active work orders.</td>
                </tr>
              ) : (
                activeWOs.slice(0, 5).map((wo) => (
                  <tr key={wo._id} className="border-t border-[var(--p-border)] hover:bg-[var(--p-accent-bg)]">
                    <td className="px-3 py-2 font-mono text-xs text-[var(--p-muted)]">{wo.workOrderNumber}</td>
                    <td className="px-3 py-2 text-[var(--p-text)]">{wo.productName}</td>
                    <td className="px-3 py-2 text-right text-[var(--p-text)]">{wo.quantity}</td>
                    <td className="px-3 py-2"><Badge tone={STATUS_TONE[wo.status] || 'gray'}>{wo.status}</Badge></td>
                    <td className="px-3 py-2"><Badge tone={PRIORITY_TONE[wo.priority] || 'gray'}>{wo.priority}</Badge></td>
                    <td className="px-3 py-2 text-[var(--p-muted)]">{wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </HomePanel>
      <QuickLinks links={QUICK_LINKS} />
    </AppHome>
  );
}

function QuickLinks({ links }: { links: typeof QUICK_LINKS }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {links.map((l) => (
        <Link key={l.label} href={l.href} className="bg-white border border-[var(--p-border)] rounded-lg p-4 hover:shadow-md hover:border-[var(--p-accent)] transition block">
          <div className="text-2xl mb-2">{l.icon}</div>
          <div className="text-sm font-semibold text-[var(--p-text)]">{l.label}</div>
          <div className="text-xs text-[var(--p-muted)] mt-1">{l.desc}</div>
        </Link>
      ))}
    </div>
  );
}
