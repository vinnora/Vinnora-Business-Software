'use client';

import { useMemo, useState } from 'react';
import type { FieldDescribe, LayoutBehavior, LayoutSection, PageLayoutDTO } from '@/lib/platform/types';
import { Badge, Btn, Checkbox, Empty, ErrorBanner, FormField, Input, Loading, Modal, SectionTitle, Select, Table, api, td, th, useLoad } from './ui';
import type { ObjectDetail } from './ObjectManager';

type LayoutsResponse = { layouts: PageLayoutDTO[]; generated: PageLayoutDTO | null };

/* ------------------------------------------------------------------ */
/* Layout list                                                         */
/* ------------------------------------------------------------------ */

export function LayoutsPanel({ obj, onChanged }: { obj: ObjectDetail; onChanged: () => void }) {
  const base = `/api/platform/objects/${obj.apiName}/layouts`;
  const { data, error, loading, reload } = useLoad(() => api<LayoutsResponse>(base), [base]);
  const [editing, setEditing] = useState<PageLayoutDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = () => {
    reload();
    onChanged();
  };

  const setDefault = async (l: PageLayoutDTO) => {
    try {
      await api(`${base}/${l._id}`, { method: 'PATCH', body: { isDefault: true } });
      refresh();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const remove = async (l: PageLayoutDTO) => {
    if (!window.confirm(`Delete layout "${l.name}"?`)) return;
    try {
      await api(`${base}/${l._id}`, { method: 'DELETE' });
      refresh();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  if (editing) {
    return (
      <LayoutEditor
        obj={obj}
        layout={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  const layouts = data?.layouts || [];
  return (
    <div>
      <SectionTitle
        title="Page Layouts"
        subtitle="Arrange fields into sections and choose which are required or read-only on the record form. Assign layouts to profiles in Layout Assignment."
        actions={
          <Btn variant="primary" onClick={() => setCreating(true)}>
            + New Layout
          </Btn>
        }
      />
      <ErrorBanner error={error || actionError} />
      {loading && !data ? (
        <Loading />
      ) : layouts.length === 0 ? (
        <Empty>
          <p className="mb-3">
            {obj.label} uses the automatic layout: every field, grouped into standard sections. Create a layout to rearrange fields, set required or
            read-only fields, and give different profiles different layouts.
          </p>
          <Btn variant="primary" onClick={() => setCreating(true)}>
            Create layout from automatic layout
          </Btn>
        </Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Layout Name</th>
              <th className={th}>Sections</th>
              <th className={th}>Fields</th>
              <th className={th}></th>
            </tr>
          }
        >
          {layouts.map((l) => (
            <tr key={l._id}>
              <td className={td}>
                <button type="button" onClick={() => setEditing(l)} className="font-medium text-[var(--p-accent)] hover:underline">
                  {l.name}
                </button>
                {l.isDefault && (
                  <span className="ml-2">
                    <Badge tone="green">Default</Badge>
                  </span>
                )}
                {l.description && <div className="text-xs text-gray-500">{l.description}</div>}
              </td>
              <td className={`${td} text-gray-600`}>{l.sections.length}</td>
              <td className={`${td} text-gray-600`}>{l.sections.reduce((n, s) => n + s.items.length, 0)}</td>
              <td className={`${td} text-right whitespace-nowrap space-x-3 text-xs`}>
                <button type="button" onClick={() => setEditing(l)} className="text-[var(--p-accent)] hover:underline">
                  Edit
                </button>
                {!l.isDefault && (
                  <button type="button" onClick={() => setDefault(l)} className="text-gray-600 hover:underline">
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => remove(l)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {creating && (
        <NewLayoutModal
          obj={obj}
          layouts={layouts}
          onClose={() => setCreating(false)}
          onCreated={(l) => {
            setCreating(false);
            refresh();
            setEditing(l);
          }}
        />
      )}
    </div>
  );
}

function NewLayoutModal({
  obj,
  layouts,
  onClose,
  onCreated,
}: {
  obj: ObjectDetail;
  layouts: PageLayoutDTO[];
  onClose: () => void;
  onCreated: (l: PageLayoutDTO) => void;
}) {
  const [name, setName] = useState(layouts.length ? '' : `${obj.label} Layout`);
  const [description, setDescription] = useState('');
  const [cloneFrom, setCloneFrom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      const l = await api<PageLayoutDTO & { _id: string }>(`/api/platform/objects/${obj.apiName}/layouts`, {
        body: { name, description, cloneFrom: cloneFrom || undefined },
      });
      onCreated({ ...l, _id: String(l._id) });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Page Layout"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!name.trim()} onClick={save}>
            Save
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <FormField label="Layout Name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <FormField label="Start from">
        <Select value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
          <option value="">Automatic layout (all fields)</option>
          {layouts.map((l) => (
            <option key={l._id} value={l._id}>
              Copy of {l.name}
            </option>
          ))}
        </Select>
      </FormField>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Layout editor (drag & drop)                                         */
/* ------------------------------------------------------------------ */

type DragData = { field: string; from: { section: number; index: number } | null };

const BEHAVIOR_LABEL: Record<LayoutBehavior, string> = { edit: 'Edit', required: 'Required', readonly: 'Read-only' };

function LayoutEditor({
  obj,
  layout,
  onCancel,
  onSaved,
}: {
  obj: ObjectDetail;
  layout: PageLayoutDTO;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(layout.name);
  const [sections, setSections] = useState<LayoutSection[]>(() => layout.sections.map((s) => ({ ...s, items: [...s.items] })));
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const byApi = useMemo(() => new Map(obj.fields.map((f) => [f.apiName, f])), [obj.fields]);
  const placed = new Set(sections.flatMap((s) => s.items.map((i) => i.field)));
  const palette = obj.fields.filter(
    (f) => f.active !== false && !placed.has(f.apiName) && (!query || f.label.toLowerCase().includes(query.toLowerCase())),
  );
  const missingRequired = obj.fields.filter((f) => f.required && !f.isSystem && !placed.has(f.apiName));

  const lockedBehavior = (f?: FieldDescribe): LayoutBehavior | null =>
    !f ? null : f.isSystem || f.type === 'formula' ? 'readonly' : f.required ? 'required' : null;

  const drop = (target: { section: number; index: number }, data: DragData) => {
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, items: [...s.items] }));
      let item = { field: data.field, behavior: (lockedBehavior(byApi.get(data.field)) || 'edit') as LayoutBehavior };
      let { index } = target;
      if (data.from) {
        const [removed] = next[data.from.section].items.splice(data.from.index, 1);
        item = removed;
        if (data.from.section === target.section && data.from.index < index) index--;
      }
      next[target.section].items.splice(Math.min(index, next[target.section].items.length), 0, item);
      return next;
    });
    setDropTarget(null);
  };

  const onDragStart = (e: React.DragEvent, data: DragData) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  };
  const readDrag = (e: React.DragEvent): DragData | null => {
    try {
      return JSON.parse(e.dataTransfer.getData('text/plain')) as DragData;
    } catch {
      return null;
    }
  };

  const updateSection = (i: number, patch: Partial<LayoutSection>) => setSections(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const moveSection = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
  };
  const removeItem = (si: number, ii: number) => updateSection(si, { items: sections[si].items.filter((_, idx) => idx !== ii) });
  const addToSection = (field: string) => {
    const target = Math.max(0, sections.findIndex((s) => s.id !== 'system'));
    if (!sections.length) {
      setSections([{ id: `section-${Date.now()}`, label: 'Information', columns: 2, items: [{ field, behavior: lockedBehavior(byApi.get(field)) || 'edit' }] }]);
      return;
    }
    drop({ section: target, index: sections[target].items.length }, { field, from: null });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/platform/objects/${obj.apiName}/layouts/${layout._id}`, { method: 'PATCH', body: { name, sections } });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="text-sm text-[var(--p-accent)] hover:underline">
            ← Layouts
          </button>
          <Input className="!w-72 font-semibold" value={name} onChange={(e) => setName(e.target.value)} aria-label="Layout name" />
        </div>
        <div className="flex gap-2">
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving || missingRequired.length > 0}>
            {saving ? 'Saving…' : 'Save Layout'}
          </Btn>
        </div>
      </div>
      <ErrorBanner error={error} />
      {missingRequired.length > 0 && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Required fields must be on the layout: {missingRequired.map((f) => f.label).join(', ')}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Palette */}
        <div className="bg-white border border-[var(--p-border)] rounded p-3 lg:sticky lg:top-2 self-start">
          <div className="text-xs font-semibold text-gray-700 mb-2">Fields not on layout</div>
          <Input className="!py-1 text-xs mb-2" placeholder="Quick find…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="space-y-1 max-h-[55vh] overflow-y-auto">
            {palette.length === 0 && <div className="text-xs text-gray-400">All fields are placed.</div>}
            {palette.map((f) => (
              <div
                key={f.apiName}
                draggable
                onDragStart={(e) => onDragStart(e, { field: f.apiName, from: null })}
                className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded cursor-grab hover:border-[var(--p-accent)]"
              >
                <span className="truncate">{f.label}</span>
                <button type="button" onClick={() => addToSection(f.apiName)} className="text-[var(--p-accent)] shrink-0" title="Add to layout">
                  +
                </button>
              </div>
            ))}
          </div>
          <Btn
            size="sm"
            className="w-full mt-3"
            onClick={() => setSections([...sections, { id: `section-${Date.now()}`, label: 'New Section', columns: 2, items: [] }])}
          >
            + Add Section
          </Btn>
          <p className="text-[11px] text-gray-500 mt-3">Drag fields into sections, or between sections to reorder.</p>
        </div>

        {/* Canvas */}
        <div className="space-y-3">
          {sections.map((s, si) => (
            <div key={s.id} className="bg-white border border-[var(--p-border)] rounded">
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t">
                <Input className="!w-56 !py-1 text-sm font-medium" value={s.label} onChange={(e) => updateSection(si, { label: e.target.value })} aria-label="Section label" />
                <Select
                  className="!w-32 !py-1 text-xs"
                  value={s.columns}
                  onChange={(e) => updateSection(si, { columns: Number(e.target.value) === 1 ? 1 : 2 })}
                  aria-label="Columns"
                >
                  <option value={2}>2 columns</option>
                  <option value={1}>1 column</option>
                </Select>
                <Checkbox
                  checked={Boolean(s.hideOnCreate)}
                  onChange={(v) => updateSection(si, { hideOnCreate: v })}
                  label={<span className="text-xs">Hide on new records</span>}
                />
                <div className="ml-auto flex gap-2 text-xs text-gray-500">
                  <button type="button" onClick={() => moveSection(si, -1)} aria-label="Move section up">
                    ▲
                  </button>
                  <button type="button" onClick={() => moveSection(si, 1)} aria-label="Move section down">
                    ▼
                  </button>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => setSections(sections.filter((_, idx) => idx !== si))}
                    title="Remove section (fields go back to the palette)"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div
                className={`p-3 grid gap-2 min-h-16 ${s.columns === 2 ? 'sm:grid-cols-2' : ''} ${dropTarget === `s${si}` ? 'bg-[var(--p-accent-bg)]' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(`s${si}`);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const d = readDrag(e);
                  if (d) drop({ section: si, index: s.items.length }, d);
                }}
              >
                {s.items.length === 0 && <div className="text-xs text-gray-400 py-3 text-center col-span-full">Drop fields here</div>}
                {s.items.map((it, ii) => {
                  const f = byApi.get(it.field);
                  const locked = lockedBehavior(f);
                  return (
                    <div
                      key={it.field}
                      draggable
                      onDragStart={(e) => onDragStart(e, { field: it.field, from: { section: si, index: ii } })}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropTarget(`i${si}-${ii}`);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const d = readDrag(e);
                        if (d) drop({ section: si, index: ii }, d);
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 border rounded bg-white cursor-grab ${
                        dropTarget === `i${si}-${ii}` ? 'border-[var(--p-accent)] border-t-4' : 'border-gray-200'
                      }`}
                    >
                      <span className="text-gray-300 select-none" aria-hidden>
                        ⋮⋮
                      </span>
                      <span className="flex-1 min-w-0 truncate text-sm">
                        {it.behavior === 'required' && <span className="text-red-500 mr-0.5">*</span>}
                        {f?.label || it.field}
                      </span>
                      <select
                        value={locked || it.behavior}
                        disabled={Boolean(locked)}
                        title={locked ? (locked === 'required' ? 'Required by the field definition' : 'System / formula fields are read-only') : undefined}
                        onChange={(e) =>
                          updateSection(si, {
                            items: s.items.map((x, idx) => (idx === ii ? { ...x, behavior: e.target.value as LayoutBehavior } : x)),
                          })
                        }
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        {(['edit', 'required', 'readonly'] as LayoutBehavior[]).map((b) => (
                          <option key={b} value={b}>
                            {BEHAVIOR_LABEL[b]}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeItem(si, ii)} className="text-gray-400 hover:text-red-600" aria-label={`Remove ${f?.label}`}>
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {sections.length === 0 && <Empty>Add a section to start building this layout.</Empty>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout assignment                                                   */
/* ------------------------------------------------------------------ */

type AssignmentRow = { profileId: string; profileName: string; isSystem: boolean; layoutId: string | null };

export function LayoutAssignmentPanel({ obj }: { obj: ObjectDetail }) {
  const { data: rows, error, loading, reload } = useLoad(
    () => api<AssignmentRow[]>(`/api/platform/objects/${obj.apiName}/layout-assignments`),
    [obj.apiName],
  );
  const { data: layoutsData } = useLoad(() => api<LayoutsResponse>(`/api/platform/objects/${obj.apiName}/layouts`), [obj.apiName]);
  const [changes, setChanges] = useState<Record<string, string | null>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const layouts = layoutsData?.layouts || [];
  const defaultLayout = layouts.find((l) => l.isDefault);

  const save = async () => {
    setSaveError(null);
    try {
      await api(`/api/platform/objects/${obj.apiName}/layout-assignments`, { method: 'PUT', body: { assignments: changes } });
      setChanges({});
      setSaved(true);
      reload();
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Layout Assignment"
        subtitle="Choose which page layout each profile sees on new and existing records."
        actions={
          <Btn variant="primary" onClick={save} disabled={!Object.keys(changes).length}>
            Save Assignments
          </Btn>
        }
      />
      <ErrorBanner error={error || saveError} />
      {saved && !Object.keys(changes).length && <div className="text-xs text-green-700 mb-2">Assignments saved.</div>}
      {layouts.length === 0 ? (
        <Empty>Create a page layout first. Until then every profile sees the automatic layout.</Empty>
      ) : loading && !rows ? (
        <Loading />
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Profile</th>
              <th className={th}>Page Layout</th>
            </tr>
          }
        >
          {(rows || []).map((r) => {
            const value = r.profileId in changes ? changes[r.profileId] : r.layoutId;
            return (
              <tr key={r.profileId}>
                <td className={td}>
                  {r.profileName} {r.isSystem && <Badge>Standard</Badge>}
                </td>
                <td className={td}>
                  <Select
                    className="!w-72"
                    value={value || ''}
                    onChange={(e) => {
                      setSaved(false);
                      setChanges({ ...changes, [r.profileId]: e.target.value || null });
                    }}
                  >
                    <option value="">Default layout{defaultLayout ? ` (${defaultLayout.name})` : ''}</option>
                    {layouts.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
