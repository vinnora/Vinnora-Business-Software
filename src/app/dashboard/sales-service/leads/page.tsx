'use client';

import { useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { ActionErrorBanner, useActionError } from '../_components/ActionError';
import { RecordFormModal, moduleSubmit, useDescribe } from '@/components/platform/RecordForm';
import { ThemeScope, api, useLoad } from '@/components/platform/ui';
import { MODULE_THEMES } from '@/components/platform/themes';

type Lead = {
  _id: string;
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  status: string;
  rating?: string;
  leadSource?: string;
  industry?: string;
};

const API = '/api/sales-service/leads';
const STATUSES = ['New', 'Working', 'Nurturing', 'Qualified', 'Unqualified', 'Converted'];

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Working: 'bg-amber-100 text-amber-800',
  Nurturing: 'bg-purple-100 text-purple-800',
  Qualified: 'bg-green-100 text-green-800',
  Unqualified: 'bg-gray-100 text-gray-700',
  Converted: 'bg-emerald-200 text-emerald-900',
};

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Lead | 'new' | null>(null);
  const actionError = useActionError();
  const access = useDescribe('Lead').data?.access;
  const canCreate = access?.create ?? true;
  const canEdit = access?.edit ?? true;
  const canDelete = access?.delete ?? true;

  const { data, error: loadError, loading, reload } = useLoad(() => {
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (statusFilter) params.set('status', statusFilter);
    return api<Lead[]>(`${API}?${params}`);
  }, [query, statusFilter]);
  const items = Array.isArray(data) ? data : [];

  const applySearch = () => {
    if (search === query) reload();
    else setQuery(search);
  };

  const convert = async (leadId: string, name: string) => {
    if (!confirm(`Convert ${name} to Account + Contact + Opportunity?`)) return;
    await actionError.run(() => api(API, { body: { action: 'convert', leadId } }));
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    await actionError.run(() => api(`${API}?id=${id}`, { method: 'DELETE' }));
    reload();
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Sales"
        count={items.length}
        actions={
          <>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setQuery(search);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Search…"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded"
            />
            {canCreate && (
              <button
                onClick={() => setEditing('new')}
                className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
              >
                + New Lead
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
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Company</th>
                <th className="text-left px-4 py-2.5">Title</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Rating</th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-left px-4 py-2.5">Email</th>
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
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No leads yet.</td>
                </tr>
              ) : (
                items.map((l) => (
                  <tr key={l._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-medium text-[#0176d3]">
                      {l.firstName} {l.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{l.company || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.title || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded ${STATUS_COLORS[l.status] || 'bg-gray-100'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{l.rating || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.leadSource || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.email || '—'}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {l.status !== 'Converted' && canEdit && (
                        <button
                          onClick={() => convert(l._id, `${l.firstName} ${l.lastName}`)}
                          className="text-xs text-green-700 hover:underline mr-3"
                        >
                          Convert
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => setEditing(l)} className="text-xs text-[#0176d3] hover:underline mr-3">
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => remove(l._id)} className="text-xs text-red-600 hover:underline">
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
          object="Lead"
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
