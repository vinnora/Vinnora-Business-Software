'use client';

import { useMemo, useState } from 'react';
import type { FieldDescribe } from '@/lib/platform/types';
import { Btn, Empty, ErrorBanner, Input, Loading, Modal, ThemeScope, api, useLoad, type PlatformTheme } from './ui';
import { FieldValue, RecordDetails, RecordFormModal, platformSubmit, useDescribe } from './RecordForm';

type Rec = Record<string, unknown> & { _id: string };

/** Generic list + detail page for a custom object. */
export function CustomObjectPage({ object, theme }: { object: string; theme?: PlatformTheme }) {
  const describe = useDescribe(object);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const records = useLoad(
    () => api<Rec[]>(`/api/platform/records/${object}?search=${encodeURIComponent(query)}`),
    [object, query],
  );
  const [editing, setEditing] = useState<Rec | null | 'new'>(null);
  const [viewing, setViewing] = useState<Rec | null>(null);
  const [error, setError] = useState<string | null>(null);

  const d = describe.data;
  const columns: FieldDescribe[] = useMemo(() => {
    if (!d) return [];
    const byApi = new Map(d.object.fields.map((f) => [f.apiName, f]));
    const fromLayout = d.layout.sections.flatMap((s) => s.items.map((i) => byApi.get(i.field))).filter((f): f is FieldDescribe => Boolean(f));
    const cols = fromLayout.filter((f) => !f.isSystem && f.type !== 'textarea').slice(0, 5);
    return cols.length ? cols : d.object.fields.slice(0, 1);
  }, [d]);

  const remove = async (r: Rec) => {
    if (!window.confirm('Delete this record?')) return;
    setError(null);
    try {
      await api(`/api/platform/records/${object}/${r._id}`, { method: 'DELETE' });
      setViewing(null);
      records.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ThemeScope theme={theme}>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Custom Module</div>
          <h1 className="text-xl font-semibold text-gray-900">
            {d?.object.pluralLabel || object}
            {records.data && <span className="ml-2 text-sm font-normal text-gray-500">• {records.data.length} items</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          <Input
            className="!w-56"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setQuery(search)}
          />
          {d?.access.create && (
            <Btn variant="primary" onClick={() => setEditing('new')}>
              + New {d.object.label}
            </Btn>
          )}
        </div>
      </div>
      <div className="p-6">
        <ErrorBanner error={describe.error || records.error || error} />
        {(describe.loading && !d) || (records.loading && !records.data) ? (
          <Loading />
        ) : !records.data?.length ? (
          <Empty>
            No {d?.object.pluralLabel.toLowerCase() || 'records'} yet.
            {d?.access.create && (
              <div className="mt-3">
                <Btn variant="primary" onClick={() => setEditing('new')}>
                  Create the first one
                </Btn>
              </div>
            )}
          </Empty>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
                <tr>
                  {columns.map((c) => (
                    <th key={c.apiName} className="text-left px-4 py-2.5">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {records.data.map((r) => (
                  <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50">
                    {columns.map((c, i) => (
                      <td key={c.apiName} className="px-4 py-2.5 text-gray-700">
                        {i === 0 ? (
                          <button type="button" className="font-medium text-[var(--p-accent)] hover:underline text-left" onClick={() => setViewing(r)}>
                            <FieldValue field={c} record={r} />
                          </button>
                        ) : (
                          <FieldValue field={c} record={r} />
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-3 text-xs">
                      {d?.access.edit && (
                        <button type="button" className="text-[var(--p-accent)] hover:underline" onClick={() => setEditing(r)}>
                          Edit
                        </button>
                      )}
                      {d?.access.delete && (
                        <button type="button" className="text-red-600 hover:underline" onClick={() => remove(r)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <RecordFormModal
          object={object}
          open
          record={editing === 'new' ? undefined : editing}
          submit={platformSubmit(object, editing === 'new' ? undefined : editing._id)}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            records.reload();
            if (viewing) setViewing(saved as Rec);
          }}
        />
      )}
      {viewing && d && (
        <Modal
          open
          size="lg"
          onClose={() => setViewing(null)}
          title={String(viewing.name ?? d.object.label)}
          footer={
            <>
              {d.access.delete && (
                <Btn variant="danger" onClick={() => remove(viewing)}>
                  Delete
                </Btn>
              )}
              {d.access.edit && (
                <Btn variant="primary" onClick={() => setEditing(viewing)}>
                  Edit
                </Btn>
              )}
            </>
          }
        >
          <RecordDetails describe={d} record={viewing} />
        </Modal>
      )}
    </ThemeScope>
  );
}
