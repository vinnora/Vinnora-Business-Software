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
  fmtINR,
} from '../_components/ui';

type Employee = {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  employmentType: string;
  status: string;
  joinDate: string;
  salary?: number;
  photoUrl?: string;
  createdAt: string;
};

const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Intern', 'Probation'];
const STATUSES = ['Active', 'On Leave', 'Notice Period', 'Terminated', 'Resigned'];

const STATUS_TONE: Record<string, 'green' | 'amber' | 'blue' | 'red' | 'gray'> = {
  Active: 'green',
  'On Leave': 'amber',
  'Notice Period': 'blue',
  Terminated: 'red',
  Resigned: 'gray',
};

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      employmentType: 'Full-Time',
      status: 'Active',
      joinDate: '',
      salary: '',
      pan: '',
      aadhaar: '',
      bankName: '',
      bankAccount: '',
      ifsc: '',
    };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (deptFilter) params.set('department', deptFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('employmentType', typeFilter);
    const data = await fetch(`/api/hrm/employees?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [statusFilter, typeFilter]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const startEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      ...e,
      joinDate: e.joinDate ? e.joinDate.slice(0, 10) : '',
      salary: e.salary || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.department || !form.designation || !form.joinDate) return;
    const payload = {
      ...form,
      salary: Number(form.salary) || 0,
    };
    const res = await fetch('/api/hrm/employees', {
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
    if (!confirm('Delete this employee?')) return;
    const res = await fetch(`/api/hrm/employees?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not delete');
    }
    load();
  };

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Human Resources"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search employees…"
              className="px-3 py-1.5 text-sm border border-[#E8D5B7] rounded focus:border-[#8B6F47] focus:outline-none"
            />
            <input
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Department…"
              className="px-3 py-1.5 text-sm border border-[#E8D5B7] rounded focus:border-[#8B6F47] focus:outline-none w-32"
            />
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Employee</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
              <tr>
                <th className="text-left px-4 py-2.5">Emp ID</th>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Department</th>
                <th className="text-left px-4 py-2.5">Designation</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Join Date</th>
                <th className="text-right px-4 py-2.5">Salary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#8B6F47]">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#8B6F47]">
                    No employees yet.
                  </td>
                </tr>
              ) : (
                items.map((e) => (
                  <tr key={e._id} className="border-t border-[#E8D5B7] hover:bg-[#FAF1E1]">
                    <td className="px-4 py-2 text-[#6B5841]">{e.employeeId}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-[#2C2620]">
                        {e.firstName} {e.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-[#6B5841]">{e.email}</td>
                    <td className="px-4 py-2 text-[#6B5841]">{e.department}</td>
                    <td className="px-4 py-2 text-[#6B5841]">{e.designation}</td>
                    <td className="px-4 py-2 text-xs text-[#6B5841]">{e.employmentType}</td>
                    <td className="px-4 py-2">
                      <Badge tone={STATUS_TONE[e.status] || 'gray'}>{e.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#6B5841]">
                      {e.joinDate ? new Date(e.joinDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">{e.salary ? fmtINR(e.salary) : '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(e)}
                        className="text-xs text-[#8B6F47] hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(e._id)}
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
        title={editing ? 'Edit Employee' : 'New Employee'}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" required>
            <TextInput
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Last Name" required>
            <TextInput
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
          <Field label="Email" required>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Department" required>
            <TextInput
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </Field>
          <Field label="Designation" required>
            <TextInput
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
          </Field>
          <Field label="Employment Type">
            <SelectInput
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
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
          <Field label="Join Date" required>
            <TextInput
              type="date"
              value={form.joinDate}
              onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
            />
          </Field>
          <Field label="Salary (INR)">
            <TextInput
              type="number"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
            />
          </Field>
          <Field label="PAN">
            <TextInput
              value={form.pan}
              onChange={(e) => setForm({ ...form, pan: e.target.value })}
            />
          </Field>
          <Field label="Aadhaar">
            <TextInput
              value={form.aadhaar}
              onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
            />
          </Field>
          <Field label="Bank Name">
            <TextInput
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </Field>
          <Field label="Bank Account">
            <TextInput
              value={form.bankAccount}
              onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
            />
          </Field>
          <Field label="IFSC">
            <TextInput
              value={form.ifsc}
              onChange={(e) => setForm({ ...form, ifsc: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
