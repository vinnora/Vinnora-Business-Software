'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Modal,
  Field,
  TextInput,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  Tile,
  apiOk,
} from '../_components/ui';

const FORMATS = ['CODE128', 'CODE39', 'CODE93', 'EAN13', 'EAN8', 'UPC', 'ITF', 'QR'];
const PRINT_LAYOUTS = [
  { value: 1, label: '1 UPS (single)' },
  { value: 2, label: '2 UPS' },
  { value: 3, label: '3 UPS' },
  { value: 4, label: '4 UPS' },
  { value: 12, label: 'A4 sheet (12)' },
  { value: 24, label: 'A4 sheet (24)' },
  { value: 65, label: 'A4 sheet (65)' },
];

export default function BarcodesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState('CODE128');
  const [layout, setLayout] = useState(4);
  const [printOpen, setPrintOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [genText, setGenText] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/inventory/items').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i._id)));
  };

  const generateForSelected = async () => {
    // Auto-generate barcode strings for items missing one
    for (const id of selectedIds) {
      const item = items.find((i) => i._id === id);
      if (!item || item.barcode) continue;
      const newCode = `${format === 'EAN13' ? '890' : ''}${Date.now().toString().slice(-10)}`;
      const res = await fetch('/api/inventory/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id, barcode: newCode, barcodeFormat: format }),
      });
      if (!(await apiOk(res))) break;
    }
    load();
  };

  const selectedItems = items.filter((i) => selectedIds.has(i._id));

  return (
    <>
      <PageHeader
        title="Barcode Generator"
        subtitle="Bulk barcode creation &amp; printing"
        actions={
          <>
            <SelectInput value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => <option key={f}>{f}</option>)}
            </SelectInput>
            <SelectInput value={layout} onChange={(e) => setLayout(Number(e.target.value))}>
              {PRINT_LAYOUTS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </SelectInput>
            <SecondaryButton onClick={() => setGenOpen(true)}>Standalone</SecondaryButton>
            <PrimaryButton onClick={generateForSelected} disabled={selectedIds.size === 0}>
              Generate ({selectedIds.size})
            </PrimaryButton>
            <PrimaryButton onClick={() => setPrintOpen(true)} disabled={selectedIds.size === 0}>
              Print
            </PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Items with Barcode" value={items.filter((i) => i.barcode).length} tone="fire" />
          <Tile label="Without Barcode" value={items.filter((i) => !i.barcode).length} tone="amber" />
          <Tile label="Selected" value={selectedIds.size} tone="glow" />
        </div>

        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
              <tr>
                <th className="px-3 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === items.length && items.length > 0}
                    onChange={selectAll}
                  />
                </th>
                <th className="text-left px-4 py-2.5">Item</th>
                <th className="text-left px-4 py-2.5">Barcode</th>
                <th className="text-left px-4 py-2.5">Format</th>
                <th className="text-center px-4 py-2.5">Preview</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#A0522D]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#A0522D]">No items.</td></tr>
              ) : items.map((item) => (
                <tr key={item._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item._id)}
                      onChange={() => toggle(item._id)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-[#4A1D0F]">{item.name}</div>
                    <div className="text-xs font-mono text-[#A0522D]">{item.itemCode}</div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-[#6B2410]">{item.barcode || '—'}</td>
                  <td className="px-4 py-2 text-xs text-[#6B2410]">{item.barcodeFormat || 'CODE128'}</td>
                  <td className="px-4 py-2 text-center">
                    {item.barcode && <BarcodeSVG value={item.barcode} format={item.barcodeFormat || 'CODE128'} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standalone barcode generator */}
      <Modal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title="Standalone Barcode"
        footer={<SecondaryButton onClick={() => setGenOpen(false)}>Close</SecondaryButton>}
      >
        <Field label="Text">
          <TextInput value={genText} onChange={(e) => setGenText(e.target.value)} />
        </Field>
        <Field label="Format">
          <SelectInput value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((f) => <option key={f}>{f}</option>)}
          </SelectInput>
        </Field>
        {genText && (
          <div className="mt-4 p-4 border border-[#FFE5C4] rounded bg-white text-center">
            <BarcodeSVG value={genText} format={format} large />
            <div className="mt-2 font-mono text-xs text-[#6B2410]">{genText}</div>
          </div>
        )}
      </Modal>

      {/* Print preview */}
      <Modal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title={`Print Preview — ${layout} UPS`}
        width="max-w-4xl"
        footer={
          <>
            <SecondaryButton onClick={() => setPrintOpen(false)}>Close</SecondaryButton>
            <PrimaryButton onClick={() => window.print()}>Print</PrimaryButton>
          </>
        }
      >
        <div
          className="grid gap-2 p-4 bg-white"
          style={{ gridTemplateColumns: `repeat(${Math.min(layout, 4)}, 1fr)` }}
        >
          {selectedItems.map((item) => (
            <div
              key={item._id}
              className="border border-dashed border-[#FFE5C4] rounded p-3 text-center"
            >
              <div className="text-xs font-medium text-[#4A1D0F] truncate">{item.name}</div>
              {item.barcode ? (
                <>
                  <BarcodeSVG value={item.barcode} format={item.barcodeFormat || 'CODE128'} />
                  <div className="font-mono text-[10px] text-[#6B2410] mt-1">{item.barcode}</div>
                </>
              ) : (
                <div className="text-xs text-red-600 py-3">No barcode</div>
              )}
              <div className="text-[10px] text-[#A0522D]">₹{item.sellingPrice || 0}</div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

function BarcodeSVG({
  value,
  format,
  large = false,
}: {
  value: string;
  format: string;
  large?: boolean;
}) {
  if (format === 'QR') {
    // Simple QR-style block matrix derived from value
    const size = 8;
    const cells: boolean[] = [];
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    let r = Math.abs(hash);
    for (let i = 0; i < size * size; i++) {
      r = (r * 9301 + 49297) % 233280;
      cells.push(r % 2 === 0);
    }
    const cellSize = large ? 8 : 4;
    return (
      <svg width={size * cellSize + 4} height={size * cellSize + 4} className="inline-block">
        <rect x="0" y="0" width={size * cellSize + 4} height={size * cellSize + 4} fill="#fff" />
        {cells.map((on, i) => (
          on && (
            <rect
              key={i}
              x={2 + (i % size) * cellSize}
              y={2 + Math.floor(i / size) * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#000"
            />
          )
        ))}
      </svg>
    );
  }
  // Linear barcode visualization (deterministic from value hash)
  const bars: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    bars.push((c % 3) + 1, (c % 4) + 1);
  }
  const totalWidth = bars.reduce((a, b) => a + b, 0);
  const height = large ? 50 : 28;
  const scale = large ? 2 : 1;
  let x = 0;
  return (
    <svg width={totalWidth * scale} height={height} className="inline-block">
      <rect x="0" y="0" width={totalWidth * scale} height={height} fill="#fff" />
      {bars.map((w, i) => {
        const isBar = i % 2 === 0;
        const el = isBar ? (
          <rect key={i} x={x * scale} y="0" width={w * scale} height={height} fill="#000" />
        ) : null;
        x += w;
        return el;
      })}
    </svg>
  );
}
