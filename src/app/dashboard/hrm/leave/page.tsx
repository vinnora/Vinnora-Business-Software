'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Modal,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  Badge,
} from '../_components/ui';

type LeaveRequest = {
  _id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: string;
  approvedByName?: string;
  remarks?: string;
  createdAt: string;
};

type Employee = {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
};

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity', 'Paternity', 'Compensatory', 'Unpaid', 'Other'];
const STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

const STATUS_TONE: Record<string, 'amber' | 'green' | 'red' | 'gray'> = {
  Pending: 'amber',
  Approved: 'green',
  Rejected: 'red',
  Cancelled: 'gray',
};

export default function LeavePage() {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return {
      employeeId: '',
      leaveType: 'Casual Leave',
      startDate: '',
      endDate: '',
      days: '',
      reason: '',
      status: 'Pending',
    };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('leaveType', typeFilter);
    const data = await fetch(`/api/hrm/leave?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadEmployees = async () => {
    const data = await fetch('/api/hrm/employees').then((r) => r.json());
    setEmployees(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
    loadEmployees();
  }, [statusFilter, typeFilter]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const startEdit = (l: LeaveRequest) => {
    setEditing(l);
    setForm({
      ...l,
      startDate: l.startDate ? l.startDate.slice(0, 10) : '',
      endDate: l.endDate ? l.endDate.slice(0, 10) : '',
      days: l.days || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.employeeId || !form.leaveType || !form.startDate || !form.endDate || !form.days) return;
    const payload = {
      ...form,
      days: Number(form.days) || 0,
    };
    if (editing) {
      await fetch('/api/hrm/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      await fetch('/api/hrm/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    setForm(emptyForm());
    setEditing(null);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/hrm/leave', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this leave request?')) return;
    await fetch(`/api/hrm/leave?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Leave Requests"
        subtitle="Human Resources"
        count={items.length}
        actions={
          <>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All leave types</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Leave Request</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
              <tr>
                <th className="text-left px-4 py-2.5">Employee</th>
                <th className="text-left px-4 py-2.5">Leave Type</th>
                <th className="text-left px-4 py-2.5">Start</th>
                <th className="text-left px-4 py-2.5">End</th>
                <th className="text-right px-4 py-2.5">Days</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Remarks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#8B6F47]">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#8B6F47]">
                    No leave requests yet.
                  </td>
                </tr>
              ) : (
                items.map((l) => (
                  <tr key={l._id} className="border-t border-[#E8D5B7] hover:bg-[#FAF1E1]">
                    <td className="px-4 py-2 font-medium text-[#2C2620]">{l.employeeName}</td>
                    <td className="px-4 py-2 text-[#6B5841]">{l.leaveType}</td>
                    <td className="px-4 py-2 text-xs text-[#6B5841]">
                      {l.startDate ? new Date(l.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#6B5841]">
                      {l.endDate ? new Date(l.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">{l.days}</td>
                    <td className="px-4 py-2">
                      <Badge tone={STATUS_TONE[l.status] || 'gray'}>{l.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#6B5841] max-w-[150px] truncate">
                      {l.remarks || '—'}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(l)}
                        className="text-xs text-[#8B6F47] hover:underline mr-2"
                      >
                        Edit
                      </button>
                      {l.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(l._id, 'Approved')}
                            className="text-xs text-green-700 hover:underline mr-2"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(l._id, 'Rejected')}
                            className="text-xs text-red-600 hover:underline mr-2"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => remove(l._id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Leave Request' : 'New Leave Request'}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee" required>
            <SelectInput
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            >
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp.employeeId}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Leave Type" required>
            <SelectInput
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Start Date" required>
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="End Date" required>
            <TextInput
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </Field>
          <Field label="Days" required>
            <TextInput
              type="number"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Reason">
          <TextArea
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </Field>
      </Modal>
    </>
  );
}
