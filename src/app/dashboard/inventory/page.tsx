'use client';

import { useEffect, useState } from 'react';
import { AppHome, HomeBars, HomePanel } from '@/components/platform/AppHome';
import { fmtINR } from './_components/ui';

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
type WarehouseRow = { _id: string; totalQty: number; totalValue: number };
type AgingBuckets = { fresh?: number; mature?: number; slow?: number; dead?: number };

export default function InventoryHome() {
  const [summary, setSummary] = useState<Summary>({});
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [aging, setAging] = useState<AgingBuckets>({});
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
        setCategories(c?.categories || []);
        setWarehouses(w?.warehouses || []);
        setAging(a?.buckets || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agingRows = [
    { label: 'Fresh (< 30d)', value: aging.fresh || 0 },
    { label: 'Mature (30-90d)', value: aging.mature || 0 },
    { label: 'Slow (90-180d)', value: aging.slow || 0 },
    { label: 'Dead (180d+)', value: aging.dead || 0 },
  ];

  return (
    <AppHome
      app="inventory"
      title="Stock Overview"
      subtitle="Your inventory at a glance."
      action={{ href: '/dashboard/inventory/items', label: '+ New Item' }}
      loading={loading}
      metrics={[
        { label: 'Items', value: summary.totalItems || 0, hint: 'SKUs', href: '/dashboard/inventory/items' },
        { label: 'Warehouses', value: summary.totalWarehouses || 0, hint: 'Active locations', href: '/dashboard/inventory/warehouses' },
        { label: 'Suppliers', value: summary.totalSuppliers || 0, hint: 'Vendor partners', href: '/dashboard/inventory/suppliers' },
        { label: 'Open POs', value: summary.openPOs || 0, hint: 'Purchase orders', href: '/dashboard/inventory/purchase-orders' },
        { label: 'Low Stock', value: summary.lowStockItems || 0, hint: 'Need reorder', href: '/dashboard/inventory/items?lowStock=true' },
        { label: 'Expiring', value: summary.expiringItems || 0, hint: 'Within 30 days', href: '/dashboard/inventory/items?expiring=true' },
      ]}
      highlights={[
        { label: 'Cost Value', value: fmtINR(summary.totalCostValue), hint: 'Inventory at cost' },
        { label: 'Retail Value', value: fmtINR(summary.totalRetailValue), hint: 'Potential revenue', emphasis: true },
        { label: 'Out of Stock', value: summary.outOfStockItems || 0, hint: 'Items with zero stock' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HomePanel title="Stock by Category" link={{ href: '/dashboard/inventory/items', label: 'View items' }}>
          <HomeBars
            loading={loading}
            empty="No categories yet."
            rows={categories.slice(0, 7).map((c) => ({ label: c._id, value: c.totalValue, caption: `${c.totalItems} • ${fmtINR(c.totalValue)}` }))}
          />
        </HomePanel>
        <HomePanel title="Stock by Warehouse" link={{ href: '/dashboard/inventory/warehouses', label: 'View warehouses' }}>
          <HomeBars
            loading={loading}
            empty="No warehouse stock yet."
            rows={warehouses.slice(0, 7).map((w) => ({ label: w._id, value: w.totalValue, caption: `${w.totalQty} units • ${fmtINR(w.totalValue)}` }))}
          />
        </HomePanel>
      </div>
      <HomePanel title="Stock Aging">
        <HomeBars loading={loading} empty="No stock yet." rows={agingRows.map((r) => ({ ...r, caption: fmtINR(r.value) }))} />
      </HomePanel>
    </AppHome>
  );
}
