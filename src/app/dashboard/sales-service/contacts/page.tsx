'use client';

import { useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { ActionErrorBanner, useActionError } from '../_components/ActionError';
import { RecordFormModal, moduleSubmit, useDescribe } from '@/components/platform/RecordForm';
import { ThemeScope, api, useLoad } from '@/components/platform/ui';
import { MODULE_THEMES } from '@/components/platform/themes';

type Contact = {
  _id: string;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  accountId?: string;
  accountName?: string;
  department?: string;
};

const API = '/api/sales-service/contacts';

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const actionError = useActionError();
  const access = useDescribe('Contact').data?.access;
  const canCreate = access?.create ?? true;
  const canEdit = access?.edit ?? true;
  const canDelete = access?.delete ?? true;

  const { data, error: loadError, loading, reload } = useLoad(
    () => api<Contact[]>(query ? `${API}?search=${encodeURIComponent(query)}` : API),
    [query],
  );
  const items = Array.isArray(data) ? data : [];

  const applySearch = () => {
    if (search === query) reload();
    else setQuery(search);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this person?')) return;
    await actionError.run(() => api(`${API}?id=${id}`, { method: 'DELETE' }));
    reload();
  };

  return (
    <>
      <PageHeader
        title="People"
        subtitle="Sales"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Search people…"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-[#0176d3] focus:outline-none"
            />
            {canCreate && (
              <button
                onClick={() => setEditing('new')}
                className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
              >
                + New
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
                <th className="text-left px-4 py-2.5">Title</th>
                <th className="text-left px-4 py-2.5">Company</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-600">{loadError}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No people yet.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-medium text-[#0176d3]">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{c.title || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.accountName || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.email || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.phone || '—'}</td>
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
          object="Contact"
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
