'use client';

import { useEffect, useState } from 'react';
import { AppHome, HomeBars, HomePanel } from '@/components/platform/AppHome';
import { fmtINR } from './_components/ui';

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

export default function HrmHome() {
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
    <AppHome
      app="hrm"
      title="HR Overview"
      subtitle="Your workforce at a glance."
      action={{ href: '/dashboard/hrm/employees', label: '+ Add Employee' }}
      loading={loading}
      metrics={[
        { label: 'Total Employees', value: summary.totalEmployees || 0, hint: 'All time', href: '/dashboard/hrm/employees' },
        { label: 'Active', value: summary.activeEmployees || 0, hint: 'Currently active', href: '/dashboard/hrm/employees' },
        { label: 'On Leave', value: summary.onLeave || 0, hint: 'Today', href: '/dashboard/hrm/leave' },
        { label: 'Pending Leaves', value: summary.pendingLeaves || 0, hint: 'Awaiting approval', href: '/dashboard/hrm/leave' },
        { label: 'Open Jobs', value: summary.openJobs || 0, hint: 'Vacancies', href: '/dashboard/hrm/recruitment' },
        { label: 'Total Applicants', value: summary.totalApplicants || 0, hint: 'All positions', href: '/dashboard/hrm/recruitment' },
      ]}
      highlights={[
        { label: 'Total Payroll', value: fmtINR(summary.totalPayroll), emphasis: true },
        { label: 'Payroll Records', value: summary.payrollRecords || 0 },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HomePanel title="Department Breakdown" link={{ href: '/dashboard/hrm/employees', label: 'View employees' }}>
          <HomeBars
            loading={loading}
            empty="No departments yet."
            rows={(summary.departments || []).map((d) => ({ label: d.name, value: d.count, caption: `${d.count} employees` }))}
          />
        </HomePanel>
        <HomePanel title="Recent Active Employees" link={{ href: '/dashboard/hrm/employees', label: 'View all' }}>
          {loading ? (
            <div className="text-sm text-[var(--p-muted)]">Loading…</div>
          ) : employees.length === 0 ? (
            <div className="text-sm text-[var(--p-muted)] text-center py-6">No active employees yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-[var(--p-muted)]">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Department</th>
                  <th className="text-left px-3 py-2">Designation</th>
                  <th className="text-left px-3 py-2">Join Date</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e._id} className="border-t border-[var(--p-border)] hover:bg-[var(--p-accent-bg)]">
                    <td className="px-3 py-2 font-medium text-[var(--p-text)]">
                      {e.firstName} {e.lastName}
                    </td>
                    <td className="px-3 py-2 text-[var(--p-muted)]">{e.department}</td>
                    <td className="px-3 py-2 text-[var(--p-muted)]">{e.designation}</td>
                    <td className="px-3 py-2 text-xs text-[var(--p-muted)]">{e.joinDate ? new Date(e.joinDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </HomePanel>
      </div>
    </AppHome>
  );
}
