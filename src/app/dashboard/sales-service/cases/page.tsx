'use client';

import { useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { ActionErrorBanner, useActionError } from '../_components/ActionError';
import { RecordFormModal, moduleSubmit, useDescribe } from '@/components/platform/RecordForm';
import { ThemeScope, api, useLoad } from '@/components/platform/ui';
import { MODULE_THEMES } from '@/components/platform/themes';

type Case = {
  _id: string;
  caseNumber: string;
  subject: string;
  status: string;
  priority: string;
  origin: string;
  type?: string;
  accountName?: string;
  contactName?: string;
  contactEmail?: string;
  ownerName?: string;
  slaDueAt?: string;
  createdAt: string;
};

const API = '/api/sales-service/cases';
const STATUSES = ['New', 'Working', 'Escalated', 'Pending Customer', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-800',
  High: 'bg-amber-100 text-amber-900',
  Critical: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Working: 'bg-amber-100 text-amber-900',
  Escalated: 'bg-red-100 text-red-800',
  'Pending Customer': 'bg-purple-100 text-purple-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-100 text-gray-700',
};

export default function CasesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [editing, setEditing] = useState<Case | 'new' | null>(null);
  const actionError = useActionError();
  const access = useDescribe('Case').data?.access;
  const canCreate = access?.create ?? true;
  const canEdit = access?.edit ?? true;
  const canDelete = access?.delete ?? true;

  const { data, error: loadError, loading, reload } = useLoad(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    return api<Case[]>(`${API}?${params}`);
  }, [statusFilter, priorityFilter]);
  const items = Array.isArray(data) ? data : [];

  const updateStatus = async (id: string, status: string) => {
    await actionError.run(() => api(API, { method: 'PATCH', body: { _id: id, status } }));
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this case?')) return;
    await actionError.run(() => api(`${API}?id=${id}`, { method: 'DELETE' }));
    reload();
  };

  const isBreached = (c: Case) =>
    c.slaDueAt && !['Resolved', 'Closed'].includes(c.status) && new Date(c.slaDueAt) < new Date();

  return (
    <>
      <PageHeader
        title="Cases"
        subtitle="Service Console"
        count={items.length}
        actions={
          <>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            {canCreate && (
              <button
                onClick={() => setEditing('new')}
                className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
              >
                + New Case
              </button>
            )}
          </>
        }
      />

      <ActionErrorBanner error={actionError.error} onDismiss={() => actionError.setError(null)} />

      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Case #</th>
                <th className="text-left px-4 py-2.5">Subject</th>
                <th className="text-left px-4 py-2.5">Account</th>
                <th className="text-left px-4 py-2.5">Priority</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Origin</th>
                <th className="text-left px-4 py-2.5">SLA</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-600">{loadError}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No cases yet.</td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{c.caseNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-[#0176d3]">{c.subject}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.accountName || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded ${PRIORITY_COLORS[c.priority]}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c._id, e.target.value)}
                        disabled={!canEdit}
                        className={`text-xs border-0 rounded px-2 py-0.5 ${STATUS_COLORS[c.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{c.origin}</td>
                    <td className="px-4 py-2.5">
                      {c.slaDueAt ? (
                        <span className={`text-xs ${isBreached(c) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {isBreached(c) ? '⚠ Breached' : new Date(c.slaDueAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {canEdit && (
                        <button onClick={() => setEditing(c)} className="text-xs text-[#0176d3] hover:underline mr-3">
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => remove(c._id)} className="text-xs text-red-600 hover:underline">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ThemeScope theme={MODULE_THEMES['sales-service']}>
        <RecordFormModal
          object="Case"
          open={editing !== null}
          record={editing && editing !== 'new' ? editing : undefined}
          submit={moduleSubmit(API, editing && editing !== 'new' ? editing._id : undefined)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      </ThemeScope>
    </>
  );
}
