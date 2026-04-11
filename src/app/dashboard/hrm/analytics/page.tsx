'use client';

import { useEffect, useState } from 'react';
import { Tile, fmtINR } from '../_components/ui';

type Summary = {
  totalEmployees?: number; activeEmployees?: number; newHires?: number; attritionRate?: number;
  departments?: { name: string; headCount: number; avgSalary: number }[];
  openJobs?: number; totalApplicants?: number; hiredThisMonth?: number;
  totalPayroll?: number; avgSalary?: number; totalDeductions?: number;
  pendingLeaves?: number; approvedLeaves?: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hrm/reports?type=dashboard-summary')
      .then(r => r.json())
      .then(d => setData(d || {}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-[#8B6F47]">Loading analytics...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-[#8B6F47]">HRM</div>
        <h1 className="text-2xl font-semibold text-[#2C2620]">Analytics</h1>
        <p className="text-sm text-[#6B5841] mt-1">Workforce metrics and HR insights.</p>
      </div>

      {/* Workforce Overview */}
      <h2 className="text-sm font-semibold text-[#2C2620] mb-3 uppercase tracking-wide">Workforce Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile label="Total Employees" value={data.totalEmployees || 0} tone="clay" />
        <Tile label="Active" value={data.activeEmployees || 0} tone="sandstone" />
        <Tile label="New Hires" value={data.newHires || 0} tone="terracotta" hint="This month" />
        <Tile label="Attrition Rate" value={`${data.attritionRate || 0}%`} tone="basalt" />
      </div>

      {/* Department Distribution */}
      <h2 className="text-sm font-semibold text-[#2C2620] mb-3 uppercase tracking-wide">Department Distribution</h2>
      <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
            <tr>
              <th className="text-left px-4 py-2.5">Department</th>
              <th className="text-right px-4 py-2.5">Head Count</th>
              <th className="text-right px-4 py-2.5">Avg Salary</th>
            </tr>
          </thead>
          <tbody>
            {(data.departments || []).length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-[#8B6F47]">No department data.</td></tr>
            ) : (data.departments || []).map(d => (
              <tr key={d.name} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                <td className="px-4 py-2 font-medium text-[#2C2620]">{d.name}</td>
                <td className="px-4 py-2 text-right text-[#6B5841]">{d.headCount}</td>
                <td className="px-4 py-2 text-right text-[#2C2620]">{fmtINR(d.avgSalary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recruitment */}
      <h2 className="text-sm font-semibold text-[#2C2620] mb-3 uppercase tracking-wide">Recruitment</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Tile label="Open Jobs" value={data.openJobs || 0} tone="clay" />
        <Tile label="Total Applicants" value={data.totalApplicants || 0} tone="sandstone" />
        <Tile label="Hired This Month" value={data.hiredThisMonth || 0} tone="terracotta" />
      </div>

      {/* Payroll Summary */}
      <h2 className="text-sm font-semibold text-[#2C2620] mb-3 uppercase tracking-wide">Payroll Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-5 border bg-gradient-to-br from-[#463A2D] to-[#8B6F47] text-white border-transparent">
          <div className="text-xs uppercase tracking-wide text-white/70">Total Payroll</div>
          <div className="text-2xl font-semibold mt-1">{fmtINR(data.totalPayroll)}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#E8D5B7]">
          <div className="text-xs uppercase tracking-wide text-[#8B6F47]">Avg Salary</div>
          <div className="text-2xl font-semibold text-[#2C2620] mt-1">{fmtINR(data.avgSalary)}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#E8D5B7]">
          <div className="text-xs uppercase tracking-wide text-[#8B6F47]">Total Deductions</div>
          <div className="text-2xl font-semibold text-red-700 mt-1">{fmtINR(data.totalDeductions)}</div>
        </div>
      </div>
    </div>
  );
}
