'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtINR, Tile } from './_components/ui';

type Summary = {
  totalItems?: number;
  totalWarehouses?: number;
  totalSuppliers?: number;
  openPOs?: number;
  inTransitTransfers?: number;
  lowStockItems?: number;
  outOfStockItems?: number;
  expiringItems?: number;
  totalCostValue?: number;
  totalRetailValue?: number;
};

type CategoryRow = { _id: string; totalItems: number; totalQty: number; totalValue: number };

export default function InventoryHome() {
  const [summary, setSummary] = useState<Summary>({});
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [aging, setAging] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/reports?type=dashboard-summary').then((r) => r.json()),
      fetch('/api/inventory/reports?type=stock-by-category').then((r) => r.json()),
      fetch('/api/inventory/reports?type=stock-by-warehouse').then((r) => r.json()),
      fetch('/api/inventory/reports?type=aging').then((r) => r.json()),
    ])
      .then(([s, c, w, a]) => {
        setSummary(s || {});
        setCategories(c.categories || []);
        setWarehouses(w.warehouses || []);
        setAging(a.buckets || {});
      })
      .finally(() => setLoading(false));
  }, []);

  const maxCatValue = Math.max(1, ...categories.map((c) => c.totalValue));
  const maxWhValue = Math.max(1, ...warehouses.map((w: any) => w.totalValue));

  return (
    <div className="p-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#A0522D]">Inventory</div>
          <h1 className="text-2xl font-semibold text-[#4A1D0F]">Stock Overview</h1>
          <p className="text-sm text-[#6B2410] mt-1">Your inventory at a glance.</p>
        </div>
        <Link
          href="/dashboard/inventory/items"
          className="px-4 py-2 bg-gradient-to-r from-[#E2671A] to-[#F4A03A] text-white text-sm rounded hover:from-[#B14411] hover:to-[#E2671A] shadow-md shadow-[#E2671A]/30"
        >
          + New Item
        </Link>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard label="Items" value={summary.totalItems || 0} hint="SKUs" href="/dashboard/inventory/items" tone="fire" />
        <KpiCard label="Warehouses" value={summary.totalWarehouses || 0} hint="Active locations" href="/dashboard/inventory/warehouses" tone="amber" />
        <KpiCard label="Suppliers" value={summary.totalSuppliers || 0} hint="Vendor partners" href="/dashboard/inventory/suppliers" tone="glow" />
        <KpiCard label="Open POs" value={summary.openPOs || 0} hint="Purchase orders" href="/dashboard/inventory/purchase-orders" tone="amber" />
        <KpiCard label="Low Stock" value={summary.lowStockItems || 0} hint="Need reorder" href="/dashboard/inventory/items?lowStock=true" tone="red" />
        <KpiCard label="Expiring" value={summary.expiringItems || 0} hint="Within 30 days" href="/dashboard/inventory/items?expiring=true" tone="red" />
      </div>

      {/* Stock value tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Tile label="Cost Value" value={fmtINR(summary.totalCostValue)} hint="Inventory at cost" tone="fire" />
        <Tile label="Retail Value" value={fmtINR(summary.totalRetailValue)} hint="Potential revenue" tone="glow" />
        <Tile
          label="Out of Stock"
          value={summary.outOfStockItems || 0}
          hint="Items with zero stock"
          tone="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock by category */}
        <div className="bg-white border border-[#FFE5C4] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#4A1D0F]">Stock by Category</h2>
            <Link
              href="/dashboard/inventory/items"
              className="text-xs text-[#E2671A] hover:underline"
            >
              View items →
            </Link>
          </div>
          {loading ? (
            <div className="text-sm text-[#A0522D]">Loading…</div>
          ) : categories.length === 0 ? (
            <div className="text-sm text-[#A0522D]">No categories yet.</div>
          ) : (
            <div className="space-y-2">
              {categories.slice(0, 7).map((c) => (
                <div key={c._id} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-[#6B2410] truncate">{c._id}</div>
                  <div className="flex-1 bg-[#FFF1D6] rounded h-6 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#E2671A] to-[#FFC15E] rounded"
                      style={{ width: `${(c.totalValue / maxCatValue) * 100}%` }}
                    />
                    <div className="relative px-2 h-full flex items-center text-xs text-[#4A1D0F]">
                      {c.totalItems} • {fmtINR(c.totalValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock by warehouse */}
        <div className="bg-white border border-[#FFE5C4] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#4A1D0F]">Stock by Warehouse</h2>
            <Link
              href="/dashboard/inventory/warehouses"
              className="text-xs text-[#E2671A] hover:underline"
            >
              View warehouses →
            </Link>
          </div>
          {loading ? (
            <div className="text-sm text-[#A0522D]">Loading…</div>
          ) : warehouses.length === 0 ? (
            <div className="text-sm text-[#A0522D]">No warehouse stock yet.</div>
          ) : (
            <div className="space-y-2">
              {warehouses.slice(0, 7).map((w: any) => (
                <div key={w._id} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-[#6B2410] truncate">{w._id}</div>
                  <div className="flex-1 bg-[#FFF1D6] rounded h-6 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#B14411] to-[#F4A03A] rounded"
                      style={{ width: `${(w.totalValue / maxWhValue) * 100}%` }}
                    />
                    <div className="relative px-2 h-full flex items-center text-xs text-[#4A1D0F]">
                      {w.totalQty} units • {fmtINR(w.totalValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock aging */}
      <div className="bg-white border border-[#FFE5C4] rounded-lg p-5 mt-4">
        <h2 className="text-base font-semibold text-[#4A1D0F] mb-3">Stock Aging</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AgingTile label="Fresh (< 30d)" value={aging.fresh || 0} color="#52B788" />
          <AgingTile label="Mature (30-90d)" value={aging.mature || 0} color="#F4A03A" />
          <AgingTile label="Slow (90-180d)" value={aging.slow || 0} color="#E2671A" />
          <AgingTile label="Dead (180d+)" value={aging.dead || 0} color="#B14411" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  tone: 'fire' | 'amber' | 'glow' | 'red';
}) {
  const tones: Record<string, string> = {
    fire: 'from-[#E2671A] to-[#F4A03A]',
    amber: 'from-[#F4A03A] to-[#FFC15E]',
    glow: 'from-[#FFC15E] to-[#FFE26A]',
    red: 'from-[#B14411] to-[#E2671A]',
  };
  return (
    <Link
      href={href}
      className="bg-white border border-[#FFE5C4] rounded-lg p-4 hover:shadow-md transition block"
    >
      <div className={`h-1 -mx-4 -mt-4 mb-3 rounded-t-lg bg-gradient-to-r ${tones[tone]}`} />
      <div className="text-xs uppercase tracking-wide text-[#A0522D]">{label}</div>
      <div className="text-3xl font-semibold text-[#4A1D0F] mt-1">{value}</div>
      <div className="text-xs text-[#A0522D] mt-1">{hint}</div>
    </Link>
  );
}

function AgingTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-3 border border-[#FFE5C4] bg-[#FFF6E5]">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <div className="text-[10px] uppercase tracking-wide text-[#A0522D]">{label}</div>
      </div>
      <div className="text-lg font-semibold text-[#4A1D0F] mt-1">{fmtINR(value)}</div>
    </div>
  );
}
