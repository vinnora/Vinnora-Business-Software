'use client';

import { useEffect, useState } from 'react';
import { PageHeader, PrimaryButton, SecondaryButton, fmtINR, Tile } from '../_components/ui';

const REPORTS = [
  { id: 'dashboard-summary', name: 'Stock Summary', desc: 'Top-level inventory KPIs' },
  { id: 'stock-by-warehouse', name: 'Stock by Warehouse', desc: 'Quantity & value per location' },
  { id: 'stock-by-category', name: 'Stock by Category', desc: 'Aggregated category view' },
  { id: 'low-stock', name: 'Low Stock Alert', desc: 'Items at or below reorder point' },
  { id: 'expiring-soon', name: 'Expiring Soon', desc: 'Items expiring within 60 days' },
  { id: 'aging', name: 'Stock Aging', desc: 'Fresh / mature / slow / dead' },
  { id: 'po-summary', name: 'PO Summary', desc: 'Purchase orders by status' },
  { id: 'supplier-performance', name: 'Supplier Performance', desc: 'Spend by supplier' },
];

export default function InventoryReportsPage() {
  const [selected, setSelected] = useState('dashboard-summary');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const data = await fetch(`/api/inventory/reports?type=${selected}`).then((r) => r.json());
    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    generate();
  }, [selected]);

  const exportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Reports &amp; Analytics"
        subtitle="Inventory Insights"
        actions={
          <>
            <PrimaryButton onClick={generate}>Refresh</PrimaryButton>
            <SecondaryButton onClick={exportJSON}>Export</SecondaryButton>
          </>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 bg-white border border-[#FFE5C4] rounded-lg overflow-hidden h-fit">
          <div className="px-4 py-2 bg-[#FFF6E5] text-xs uppercase text-[#6B2410] font-semibold">
            Reports
          </div>
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`w-full text-left px-4 py-3 border-t border-[#FFF1D6] ${
                selected === r.id ? 'bg-[#FFF6E5] border-l-2 border-l-[#E2671A]' : 'hover:bg-[#FFF6E5]'
              }`}
            >
              <div className="text-sm font-medium text-[#4A1D0F]">{r.name}</div>
              <div className="text-xs text-[#A0522D] mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 bg-white border border-[#FFE5C4] rounded-lg p-6 min-h-[400px]">
          {loading ? (
            <div className="text-sm text-[#A0522D]">Generating…</div>
          ) : !report ? (
            <div className="text-sm text-[#A0522D]">Select a report.</div>
          ) : (
            <ReportRenderer type={selected} data={report} />
          )}
        </div>
      </div>
    </>
  );
}

function ReportRenderer({ type, data }: { type: string; data: any }) {
  if (data?.error) return <div className="text-sm text-red-600">{data.error}</div>;

  if (type === 'dashboard-summary') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-[#4A1D0F] mb-4">Stock Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile label="Total Items" value={data.totalItems || 0} />
          <Tile label="Warehouses" value={data.totalWarehouses || 0} />
          <Tile label="Suppliers" value={data.totalSuppliers || 0} />
          <Tile label="Open POs" value={data.openPOs || 0} />
          <Tile label="In Transit" value={data.inTransitTransfers || 0} />
          <Tile label="Low Stock" value={data.lowStockItems || 0} tone="red" />
          <Tile label="Out of Stock" value={data.outOfStockItems || 0} tone="red" />
          <Tile label="Expiring Soon" value={data.expiringItems || 0} tone="red" />
          <Tile label="Cost Value" value={fmtINR(data.totalCostValue)} tone="amber" />
          <Tile label="Retail Value" value={fmtINR(data.totalRetailValue)} tone="glow" />
        </div>
      </div>
    );
  }

  if (type === 'stock-by-warehouse') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-[#4A1D0F] mb-4">Stock by Warehouse</h2>
        <table className="w-full text-sm">
          <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
            <tr>
              <th className="text-left px-3 py-2">Warehouse</th>
              <th className="text-right px-3 py-2">SKUs</th>
              <th className="text-right px-3 py-2">Total Qty</th>
              <th className="text-right px-3 py-2">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {data.warehouses?.map((w: any, i: number) => (
              <tr key={i} className="border-t border-[#FFF1D6]">
                <td className="px-3 py-2 font-medium">{w._id}</td>
                <td className="px-3 py-2 text-right">{w.skuCount}</td>
                <td className="px-3 py-2 text-right">{w.totalQty}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmtINR(w.totalValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'stock-by-category') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-[#4A1D0F] mb-4">Stock by Category</h2>
        <table className="w-full text-sm">
          <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
            <tr>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-right px-3 py-2">Items</th>
              <th className="text-right px-3 py-2">Total Qty</th>
              <th className="text-right px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.categories?.map((c: any, i: number) => (
              <tr key={i} className="border-t border-[#FFF1D6]">
                <td className="px-3 py-2 font-medium">{c._id}</td>
                <td className="px-3 py-2 text-right">{c.totalItems}</td>
                <td className="px-3 py-2 text-right">{c.totalQty}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmtINR(c.totalValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'low-stock' || type === 'expiring-soon') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-[#4A1D0F] mb-4">
          {type === 'low-stock' ? 'Low Stock Alert' : 'Expiring Soon'}
        </h2>
        <div className="text-xs text-[#A0522D] mb-3">{data.items?.length || 0} items</div>
        <table className="w-full text-sm">
          <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
            <tr>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-right px-3 py-2">Stock</th>
              <th className="text-right px-3 py-2">Reorder</th>
              {type === 'expiring-soon' && <th className="text-left px-3 py-2">Expires</th>}
            </tr>
          </thead>
          <tbody>
            {data.items?.map((it: any, i: number) => (
              <tr key={i} className="border-t border-[#FFF1D6]">
                <td className="px-3 py-2 font-mono text-xs text-[#A0522D]">{it.itemCode}</td>
                <td className="px-3 py-2 font-medium">{it.name}</td>
                <td className="px-3 py-2 text-right text-red-600 font-semibold">{it.totalStock}</td>
                <td className="px-3 py-2 text-right text-[#6B2410]">{it.reorderPoint}</td>
                {type === 'expiring-soon' && (
                  <td className="px-3 py-2 text-xs">
                    {it.expiryDate ? new Date(it.expiryDate).toLocaleDateString() : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'aging') {
    const total = (data.buckets?.fresh || 0) + (data.buckets?.mature || 0) + (data.buckets?.slow || 0) + (data.buckets?.dead || 0);
    return (
      <div>
        <h2 className="text-xl font-semibold text-[#4A1D0F] mb-4">Stock Aging</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <AgingCard label="Fresh < 30d" value={data.buckets?.fresh || 0} color="#52B788" />
          <AgingCard label="Mature 30-90d" value={data.buckets?.mature || 0} color="#F4A03A" />
          <AgingCard label="Slow 90-180d" value={data.buckets?.slow || 0} color="#E2671A" />
          <AgingCard label="Dead 180d+" value={data.buckets?.dead || 0} color="#B14411" />
        </div>
        <div className="text-sm text-[#6B2410]">Total: <strong>{fmtINR(total)}</strong></div>
      </div>
    );
  }

  if (type === 'po-summary') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-[#4A1D0F] mb-4">Purchase Order Summary</h2>
        <table className="w-full text-sm max-w-md">
          <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
            <tr>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Count</th>
              <th className="text-right px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.byStatus?.map((s: any, i: number) => (
              <tr key={i} className="border-t border-[#FFF1D6]">
                <td className="px-3 py-2 capitalize">{s._id}</td>
                <td className="px-3 py-2 text-right">{s.count}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmtINR(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'supplier-performance') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-[#4A1D0F] mb-4">Top Suppliers by Spend</h2>
        <table className="w-full text-sm">
          <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
            <tr>
              <th className="text-left px-3 py-2">Supplier</th>
              <th className="text-right px-3 py-2">Orders</th>
              <th className="text-right px-3 py-2">Total Spend</th>
            </tr>
          </thead>
          <tbody>
            {data.suppliers?.map((s: any, i: number) => (
              <tr key={i} className="border-t border-[#FFF1D6]">
                <td className="px-3 py-2 font-medium">{s._id}</td>
                <td className="px-3 py-2 text-right">{s.orderCount}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmtINR(s.totalSpend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
}

function AgingCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#FFF6E5] border border-[#FFE5C4] rounded p-3">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <div className="text-[10px] uppercase text-[#A0522D]">{label}</div>
      </div>
      <div className="text-lg font-semibold text-[#4A1D0F] mt-1">{fmtINR(value)}</div>
    </div>
  );
}
