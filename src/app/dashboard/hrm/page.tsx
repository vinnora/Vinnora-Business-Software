'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tile, fmtINR } from './_components/ui';

type Summary = {
  totalEmployees?: number;
  activeEmployees?: number;
  onLeave?: number;
  pendingLeaves?: number;
  openJobs?: number;
  totalApplicants?: number;
  totalPayroll?: number;
  payrollRecords?: number;
  departments?: { name: string; count: number }[];
};

type Employee = {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  joinDate?: string;
};

export default function HrmDashboard() {
  const [summary, setSummary] = useState<Summary>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/hrm/reports?type=dashboard-summary').then((r) => r.json()),
      fetch('/api/hrm/employees?status=Active').then((r) => r.json()),
    ])
      .then(([s, e]) => {
        setSummary(s || {});
        setEmployees(Array.isArray(e) ? e.slice(0, 5) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#8B6F47]">Human Resources</div>
          <h1 className="text-2xl font-semibold text-[#2C2620]">HR Dashboard</h1>
          <p className="text-sm text-[#6B5841] mt-1">Your workforce at a glance.</p>
        </div>
        <Link
          href="/dashboard/hrm/employees"
          className="px-4 py-2 bg-gradient-to-r from-[#8B6F47] to-[#C9A178] text-white text-sm rounded hover:from-[#463A2D] hover:to-[#8B6F47] shadow-sm shadow-[#8B6F47]/30"
        >
          + Add Employee
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Tile label="Total Employees" value={summary.totalEmployees || 0} tone="clay" hint="All time" />
        <Tile label="Active" value={summary.activeEmployees || 0} tone="sandstone" hint="Currently active" />
        <Tile label="On Leave" value={summary.onLeave || 0} tone="terracotta" hint="Today" />
        <Tile label="Pending Leaves" value={summary.pendingLeaves || 0} tone="basalt" hint="Awaiting approval" />
        <Tile label="Open Jobs" value={summary.openJobs || 0} tone="clay" hint="Vacancies" />
        <Tile label="Total Applicants" value={summary.totalApplicants || 0} tone="sandstone" hint="All positions" />
      </div>

      {/* Revenue / payroll row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg p-5 border bg-gradient-to-br from-[#463A2D] to-[#8B6F47] text-white border-transparent">
          <div className="text-xs uppercase tracking-wide text-white/70">Total Payroll</div>
          <div className="text-2xl font-semibold mt-1">{fmtINR(summary.totalPayroll)}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#E8D5B7]">
          <div className="text-xs uppercase tracking-wide text-[#8B6F47]">Payroll Records</div>
          <div className="text-2xl font-semibold text-[#2C2620] mt-1">{summary.payrollRecords || 0}</div>
        </div>
      </div>

      {/* Department breakdown */}
      {summary.departments && summary.departments.length > 0 && (
        <div className="bg-white border border-[#E8D5B7] rounded-lg p-5 mb-6">
          <h2 className="text-base font-semibold text-[#2C2620] mb-4">Department Breakdown</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-[#8B6F47]">
              <tr>
                <th className="text-left px-3 py-2">Department</th>
                <th className="text-right px-3 py-2">Employees</th>
              </tr>
            </thead>
            <tbody>
              {summary.departments.map((d) => (
                <tr key={d.name} className="border-t border-[#E8D5B7] hover:bg-[#FAF1E1]">
                  <td className="px-3 py-2 font-medium text-[#2C2620]">{d.name}</td>
                  <td className="px-3 py-2 text-right text-[#6B5841]">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent active employees */}
      <div className="bg-white border border-[#E8D5B7] rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#2C2620]">Recent Active Employees</h2>
          <Link href="/dashboard/hrm/employees" className="text-xs text-[#8B6F47] hover:underline">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-[#8B6F47]">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="text-sm text-[#8B6F47] text-center py-6">No active employees yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-[#8B6F47]">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Department</th>
                <th className="text-left px-3 py-2">Designation</th>
                <th className="text-left px-3 py-2">Join Date</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e._id} className="border-t border-[#E8D5B7] hover:bg-[#FAF1E1]">
                  <td className="px-3 py-2 font-medium text-[#2C2620]">
                    {e.firstName} {e.lastName}
                  </td>
                  <td className="px-3 py-2 text-[#6B5841]">{e.department}</td>
                  <td className="px-3 py-2 text-[#6B5841]">{e.designation}</td>
                  <td className="px-3 py-2 text-xs text-[#6B5841]">
                    {e.joinDate ? new Date(e.joinDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
