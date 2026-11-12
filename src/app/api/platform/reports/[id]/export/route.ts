import mongoose from 'mongoose';
import Report from '@/models/Report';
import { route, setupContext } from '@/lib/platform/api';
import { canView, runReport, toDefinition } from '@/lib/platform/reports';
import { NotFoundError } from '@/lib/platform/errors';
import type { GroupNode } from '@/lib/platform/report-types';

type P = { id: string };

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join(';') : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET — report results as CSV (detail rows; for grouped reports the group labels are prefixed). */
export const GET = route<P>(async (_req, { id }) => {
  const { ctx, tenant, perms } = await setupContext('exportData');
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Report not found');
  const doc = await Report.findOne({ _id: id, orgId: tenant }).lean();
  if (!doc || !canView(ctx, doc as { folder: string; ownerId: string })) throw new NotFoundError('Report not found');
  void perms;
  const def = toDefinition(doc as Record<string, unknown>);
  const result = await runReport(ctx, def);
  const lines: string[] = [];

  if (def.format === 'matrix' && result.matrix) {
    const m = result.matrix;
    lines.push(['', ...m.cols.map((c) => c.label), 'Total'].map(cell).join(','));
    for (const r of m.rows) {
      lines.push([r.label, ...m.cols.map((c) => m.cells[r.key][c.key]?.count ?? 0), m.rowTotals[r.key].count].map(cell).join(','));
    }
  } else {
    const groupHeads = def.format === 'summary' ? def.groupings.map((g) => g.field) : [];
    lines.push([...groupHeads, ...result.columns.map((c) => c.label)].map(cell).join(','));
    const walk = (nodes: GroupNode[], prefix: string[]) => {
      for (const n of nodes) {
        if (n.children) walk(n.children, [...prefix, n.label]);
        for (const r of n.rows || []) lines.push([...prefix, n.label, ...result.columns.map((c) => r[c.apiName])].map(cell).join(','));
      }
    };
    if (def.format === 'summary') walk(result.groups, []);
    else for (const r of result.rows) lines.push(result.columns.map((c) => cell(r[c.apiName])).join(','));
  }
  const filename = `${String(doc.apiName)}.csv`;
  return new Response(`﻿${lines.join('\r\n')}`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` },
  });
});
