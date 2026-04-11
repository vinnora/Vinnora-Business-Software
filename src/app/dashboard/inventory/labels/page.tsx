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
  Tile,
  fmtINR,
} from '../_components/ui';

const TYPES = ['product', 'shelf', 'shipping', 'qr', 'barcode', 'price-tag'];
const SIZES = ['38x25', '50x25', '50x40', '75x50', '100x50', '100x150', 'A4', 'custom'];
const FORMATS = ['CODE128', 'CODE39', 'CODE93', 'EAN13', 'EAN8', 'UPC', 'ITF', 'QR'];
const PER_SHEET = [1, 2, 3, 4, 8, 12, 24, 65];
const FIELD_TYPES = ['text', 'barcode', 'qr', 'image', 'price', 'sku'];

type Template = {
  _id: string;
  name: string;
  description?: string;
  type: string;
  size: string;
  customWidth?: number;
  customHeight?: number;
  unit: string;
  barcodeFormat: string;
  printsPerSheet: number;
  fields: any[];
  showBorder: boolean;
  active: boolean;
  isDefault: boolean;
};

export default function LabelsPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [form, setForm] = useState<any>(empty());

  function empty() {
    return {
      type: 'product',
      size: '50x25',
      unit: 'mm',
      barcodeFormat: 'CODE128',
      printsPerSheet: 1,
      fields: [
        { name: 'Product Name', type: 'text', source: 'name', x: 4, y: 3, width: 50, height: 6, fontSize: 10, fontWeight: 'bold', align: 'left' },
        { name: 'Price', type: 'price', source: 'sellingPrice', x: 4, y: 11, width: 40, height: 5, fontSize: 9, align: 'left' },
        { name: 'Barcode', type: 'barcode', source: 'barcode', x: 4, y: 16, width: 42, height: 8, align: 'center' },
      ],
      showBorder: true,
      active: true,
      isDefault: false,
    };
  }

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/inventory/label-templates').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch('/api/inventory/items')
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []));
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  const startEdit = (t: Template) => {
    setEditing(t);
    setForm(t);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    if (editing) {
      await fetch('/api/inventory/label-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...form }),
      });
    } else {
      await fetch('/api/inventory/label-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/inventory/label-templates?id=${id}`, { method: 'DELETE' });
    load();
  };

  const addField = () =>
    setForm({
      ...form,
      fields: [
        ...form.fields,
        { name: 'New Field', type: 'text', source: 'name', x: 4, y: 4, width: 40, height: 6, fontSize: 10, align: 'left' },
      ],
    });

  const updateField = (i: number, patch: any) =>
    setForm({ ...form, fields: form.fields.map((f: any, idx: number) => (idx === i ? { ...f, ...patch } : f)) });

  const removeField = (i: number) =>
    setForm({ ...form, fields: form.fields.filter((_: any, idx: number) => idx !== i) });

  const showPreview = (t: Template) => {
    setSelectedTemplate(t);
    setPreviewOpen(true);
  };

  const sampleProduct = selectedProductId
    ? products.find((p) => p._id === selectedProductId)
    : products[0] || {
        name: 'Sample Item',
        itemCode: 'SAMPLE-001',
        sellingPrice: 999,
        barcode: '8901234567890',
      };

  return (
    <>
      <PageHeader
        title="Label Generator"
        subtitle="Print Templates"
        count={items.length}
        actions={<PrimaryButton onClick={startCreate}>+ New Template</PrimaryButton>}
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Templates" value={items.length} tone="fire" />
          <Tile label="Active" value={items.filter((t) => t.active).length} tone="amber" />
          <Tile label="Default Templates" value={items.filter((t) => t.isDefault).length} tone="glow" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="text-sm text-[#A0522D]">Loading…</div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-[#FFE5C4] rounded-lg p-8 text-center text-[#A0522D] col-span-3">
              No label templates yet.
            </div>
          ) : items.map((t) => (
            <div key={t._id} className="bg-white border border-[#FFE5C4] rounded-lg p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#4A1D0F]">{t.name}</h3>
                    {t.isDefault && <Badge tone="amber">default</Badge>}
                  </div>
                  <div className="text-xs text-[#6B2410] mt-0.5">{t.description || ''}</div>
                </div>
                <Badge tone="fire">{t.type}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#6B2410] mt-3">
                <div>Size: <strong>{t.size}</strong></div>
                <div>Format: <strong>{t.barcodeFormat}</strong></div>
                <div>Per sheet: <strong>{t.printsPerSheet}</strong></div>
                <div>Fields: <strong>{t.fields.length}</strong></div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-[#FFF1D6]">
                <button onClick={() => showPreview(t)} className="text-xs text-[#E2671A] hover:underline">
                  Preview
                </button>
                <button onClick={() => startEdit(t)} className="text-xs text-[#E2671A] hover:underline">
                  Edit
                </button>
                <button onClick={() => remove(t._id)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'New Label Template'}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required>
            <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <Field label="Size">
            <SelectInput value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Unit">
            <SelectInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </SelectInput>
          </Field>
          {form.size === 'custom' && (
            <>
              <Field label="Custom Width">
                <TextInput type="number" value={form.customWidth || ''} onChange={(e) => setForm({ ...form, customWidth: Number(e.target.value) })} />
              </Field>
              <Field label="Custom Height">
                <TextInput type="number" value={form.customHeight || ''} onChange={(e) => setForm({ ...form, customHeight: Number(e.target.value) })} />
              </Field>
            </>
          )}
          <Field label="Barcode Format">
            <SelectInput value={form.barcodeFormat} onChange={(e) => setForm({ ...form, barcodeFormat: e.target.value })}>
              {FORMATS.map((f) => <option key={f}>{f}</option>)}
            </SelectInput>
          </Field>
          <Field label="Prints per Sheet">
            <SelectInput value={form.printsPerSheet} onChange={(e) => setForm({ ...form, printsPerSheet: Number(e.target.value) })}>
              {PER_SHEET.map((n) => <option key={n} value={n}>{n}</option>)}
            </SelectInput>
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showBorder} onChange={(e) => setForm({ ...form, showBorder: e.target.checked })} />
              Show border
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              Default template
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
          </div>
        </div>

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#4A1D0F]">Fields</h3>
          <button onClick={addField} className="text-xs text-[#E2671A]">+ Add field</button>
        </div>
        {form.fields.map((f: any, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2 text-xs">
            <input
              placeholder="Name"
              value={f.name}
              onChange={(e) => updateField(i, { name: e.target.value })}
              className="col-span-3 px-2 py-1 border border-[#FFE5C4] rounded"
            />
            <select
              value={f.type}
              onChange={(e) => updateField(i, { type: e.target.value })}
              className="col-span-2 px-2 py-1 border border-[#FFE5C4] rounded bg-white"
            >
              {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input
              placeholder="Source field"
              value={f.source}
              onChange={(e) => updateField(i, { source: e.target.value })}
              className="col-span-3 px-2 py-1 border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="X"
              value={f.x}
              onChange={(e) => updateField(i, { x: Number(e.target.value) })}
              className="col-span-1 px-2 py-1 border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="Y"
              value={f.y}
              onChange={(e) => updateField(i, { y: Number(e.target.value) })}
              className="col-span-1 px-2 py-1 border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="Font"
              value={f.fontSize || 10}
              onChange={(e) => updateField(i, { fontSize: Number(e.target.value) })}
              className="col-span-1 px-2 py-1 border border-[#FFE5C4] rounded"
            />
            <button onClick={() => removeField(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}
      </Modal>

      {/* Preview */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Preview: ${selectedTemplate?.name || ''}`}
        width="max-w-2xl"
        footer={
          <>
            <SecondaryButton onClick={() => setPreviewOpen(false)}>Close</SecondaryButton>
            <PrimaryButton onClick={() => window.print()}>Print</PrimaryButton>
          </>
        }
      >
        <Field label="Sample product">
          <SelectInput
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">— Sample data —</option>
            {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </SelectInput>
        </Field>
        {selectedTemplate && sampleProduct && (
          <div className="mt-4 flex justify-center bg-[#FFF6E5] p-6 rounded">
            <LabelPreview template={selectedTemplate} product={sampleProduct} />
          </div>
        )}
      </Modal>
    </>
  );
}

function LabelPreview({ template, product }: { template: any; product: any }) {
  const [w, h] = template.size === 'custom'
    ? [template.customWidth || 50, template.customHeight || 25]
    : (template.size.split('x').map(Number) as [number, number]) || [50, 25];
  const scale = 4;
  return (
    <div
      style={{
        width: w * scale,
        height: h * scale,
        background: '#fff',
        border: template.showBorder ? '1px solid #999' : 'none',
        position: 'relative',
        fontFamily: 'sans-serif',
      }}
    >
      {template.fields.map((f: any, i: number) => {
        const x = f.x * scale;
        const y = f.y * scale;
        const value = f.type === 'price'
          ? `₹${product[f.source] || 0}`
          : product[f.source] || '';
        if (f.type === 'barcode' && value) {
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: y }}>
              <div style={{ display: 'flex', height: f.height * scale, alignItems: 'end' }}>
                {value.split('').map((ch: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      width: ((ch.charCodeAt(0) % 3) + 1),
                      height: '100%',
                      background: idx % 2 === 0 ? '#000' : 'transparent',
                      marginRight: 1,
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 6, fontFamily: 'monospace', textAlign: 'center' }}>{value}</div>
            </div>
          );
        }
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              fontSize: (f.fontSize || 10) * 0.9,
              fontWeight: f.fontWeight || 'normal',
              textAlign: f.align || 'left',
              width: f.width ? f.width * scale : 'auto',
              color: '#000',
            }}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
}
