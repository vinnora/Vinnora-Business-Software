'use client';

import { useEffect, useState } from 'react';
import { Tile, fmtINR } from '../_components/ui';

type Summary = {
  totalWorkOrders?: number;
  activeWorkOrders?: number;
  completedWorkOrders?: number;
  totalProduced?: number;
  totalRejected?: number;
  avgCycleTime?: number;
  defectRate?: number;
  firstPassYield?: number;
  qualityChecksTotal?: number;
  qualityChecksPassed?: number;
  qualityChecksFailed?: number;
  totalSuppliers?: number;
  activeSuppliers?: number;
  pendingRequisitions?: number;
  totalMaterialCost?: number;
  machineCount?: number;
  avgUtilization?: number;
  totalDowntimeMinutes?: number;
  avgOEE?: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/manufacturing/reports?type=dashboard-summary')
      .then((r) => r.json())
      .then((d) => setData(d || {}))
      .finally(() => setLoading(false));
  }, []);

  const defectRate = data.totalProduced
    ? ((data.totalRejected || 0) / data.totalProduced * 100).toFixed(2)
    : '0';
  const passRate = data.qualityChecksTotal
    ? ((data.qualityChecksPassed || 0) / data.qualityChecksTotal * 100).toFixed(1)
    : '0';

  if (loading) return <div className="p-6 text-[#6B7280]">Loading analytics...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-[#6B7280]">Manufacturing</div>
        <h1 className="text-2xl font-semibold text-[#1C1C1E]">Analytics</h1>
        <p className="text-sm text-[#4A4E54] mt-1">Production metrics, quality insights, and resource utilization.</p>
      </div>

      {/* Production Overview */}
      <h2 className="text-sm font-semibold text-[#1C1C1E] mb-3 uppercase tracking-wide">Production Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile label="Total Work Orders" value={data.totalWorkOrders || 0} tone="steel" />
        <Tile label="Active" value={data.activeWorkOrders || 0} tone="gold" hint="In Progress" />
        <Tile label="Completed" value={data.completedWorkOrders || 0} tone="copper" />
        <Tile label="Total Produced" value={(data.totalProduced || 0).toLocaleString()} tone="iron" />
      </div>

      {/* Quality Metrics */}
      <h2 className="text-sm font-semibold text-[#1C1C1E] mb-3 uppercase tracking-wide">Quality Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile label="Total Rejected" value={(data.totalRejected || 0).toLocaleString()} tone="steel" />
        <Tile label="Defect Rate" value={`${defectRate}%`} tone="gold" hint={`${data.totalRejected || 0} of ${data.totalProduced || 0}`} />
        <Tile label="QC Pass Rate" value={`${passRate}%`} tone="copper" hint={`${data.qualityChecksPassed || 0} passed`} />
        <Tile
          label="First Pass Yield"
          value={data.firstPassYield ? `${data.firstPassYield}%` : '—'}
          tone="iron"
        />
      </div>

      {/* Supply Chain */}
      <h2 className="text-sm font-semibold text-[#1C1C1E] mb-3 uppercase tracking-wide">Supply Chain</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile label="Total Suppliers" value={data.totalSuppliers || 0} tone="steel" />
        <Tile label="Active Suppliers" value={data.activeSuppliers || 0} tone="gold" />
        <Tile label="Pending Requisitions" value={data.pendingRequisitions || 0} tone="copper" />
        <Tile label="Material Cost" value={fmtINR(data.totalMaterialCost)} tone="iron" />
      </div>

      {/* Resource Utilization */}
      <h2 className="text-sm font-semibold text-[#1C1C1E] mb-3 uppercase tracking-wide">Resource Utilization</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg p-5 border bg-gradient-to-br from-[#4A4E54] to-[#6B7280] text-white border-transparent">
          <div className="text-xs uppercase tracking-wide text-white/70">Machines</div>
          <div className="text-2xl font-semibold mt-1">{data.machineCount || 0}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#E5E7EB]">
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">Avg Utilization</div>
          <div className="text-2xl font-semibold text-[#1C1C1E] mt-1">{data.avgUtilization ? `${data.avgUtilization}%` : '—'}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#E5E7EB]">
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">Total Downtime</div>
          <div className="text-2xl font-semibold text-[#B87333] mt-1">{(data.totalDowntimeMinutes || 0).toLocaleString()} min</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#E5E7EB]">
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">Avg OEE</div>
          <div className={`text-2xl font-semibold mt-1 ${(data.avgOEE || 0) >= 85 ? 'text-green-700' : (data.avgOEE || 0) >= 60 ? 'text-[#D4A843]' : 'text-red-700'}`}>
            {data.avgOEE ? `${data.avgOEE}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
