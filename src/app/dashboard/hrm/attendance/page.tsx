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

type Attendance = {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  status: string;
  shift?: string;
  remarks?: string;
  createdAt: string;
};

type Employee = {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
};

const ATT_STATUSES = ['Present', 'Absent', 'Half Day', 'Late', 'On Leave', 'Holiday', 'Week Off'];

const STATUS_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray'> = {
  Present: 'green',
  Absent: 'red',
  'Half Day': 'amber',
  Late: 'blue',
  'On Leave': 'purple',
  Holiday: 'gray',
  'Week Off': 'gray',
};

export default function AttendancePage() {
  const [items, setItems] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return {
      employeeId: '',
      date: '',
      checkIn: '',
      checkOut: '',
      status: 'Present',
      shift: '',
      remarks: '',
    };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFilter) params.set('date', dateFilter);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/hrm/attendance?${params}`).then((r) => r.json());
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
  }, [statusFilter]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const startEdit = (a: Attendance) => {
    setEditing(a);
    setForm({
      ...a,
      date: a.date ? a.date.slice(0, 10) : '',
      checkIn: a.checkIn || '',
      checkOut: a.checkOut || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.employeeId || !form.date) return;
    const payload = { ...form };
    const res = await fetch('/api/hrm/attendance', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { _id: editing._id, ...payload } : payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not save');
      return;
    }
    setOpen(false);
    setForm(emptyForm());
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    const res = await fetch(`/api/hrm/attendance?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not delete');
    }
    load();
  };

  const fmtTime = (dt?: string) => {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Human Resources"
        count={items.length}
        actions={
          <>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              onBlur={() => load()}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="px-3 py-1.5 text-sm border border-[#E8D5B7] rounded focus:border-[#8B6F47] focus:outline-none"
            />
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {ATT_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Record</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
              <tr>
                <th className="text-left px-4 py-2.5">Employee</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Check In</th>
                <th className="text-left px-4 py-2.5">Check Out</th>
                <th className="text-right px-4 py-2.5">Hours</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Shift</th>
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
                    No attendance records yet.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a._id} className="border-t border-[#E8D5B7] hover:bg-[#FAF1E1]">
                    <td className="px-4 py-2 font-medium text-[#2C2620]">{a.employeeName}</td>
                    <td className="px-4 py-2 text-xs text-[#6B5841]">
                      {a.date ? new Date(a.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#6B5841]">{fmtTime(a.checkIn)}</td>
                    <td className="px-4 py-2 text-xs text-[#6B5841]">{fmtTime(a.checkOut)}</td>
                    <td className="px-4 py-2 text-right">
                      {a.hoursWorked != null ? a.hoursWorked.toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={STATUS_TONE[a.status] || 'gray'}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#6B5841]">{a.shift || '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(a)}
                        className="text-xs text-[#8B6F47] hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(a._id)}
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
        title={editing ? 'Edit Attendance' : 'New Attendance Record'}
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
          <Field label="Date" required>
            <TextInput
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Check In">
            <TextInput
              type="datetime-local"
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            />
          </Field>
          <Field label="Check Out">
            <TextInput
              type="datetime-local"
              value={form.checkOut}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {ATT_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Shift">
            <TextInput
              value={form.shift}
              onChange={(e) => setForm({ ...form, shift: e.target.value })}
              placeholder="e.g. Morning, Evening, Night"
            />
          </Field>
        </div>
        <Field label="Remarks">
          <TextArea
            rows={2}
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </Field>
      </Modal>
    </>
  );
}
