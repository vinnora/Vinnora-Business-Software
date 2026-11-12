import { ForbiddenError, getAuthContext } from '@/lib/auth-helpers';
import { readJson, route, str } from '@/lib/platform/api';
import { getEffectivePermissions } from '@/lib/platform/access';
import { BadRequestError } from '@/lib/platform/errors';
import { createJob, exportRecords } from '@/lib/platform/data-loader';
import type { Condition } from '@/lib/platform/types';

/**
 * POST { objectApiName, fields?, filters?, filterLogic? } → text/csv download.
 * Records an 'export' job in the history.
 */
export const POST = route(async (req) => {
  const ctx = await getAuthContext();
  const perms = await getEffectivePermissions(ctx);
  if (!perms.system.exportData) throw new ForbiddenError('You need the Export Data permission to export records.');
  const body = await readJson(req);

  if (body.fields !== undefined && (!Array.isArray(body.fields) || body.fields.some((f) => typeof f !== 'string'))) {
    throw new BadRequestError('fields must be an array of field API names');
  }
  if (body.filters !== undefined && !Array.isArray(body.filters)) throw new BadRequestError('filters must be an array');
  const filters = ((body.filters as unknown[]) || [])
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
    .map((c) => ({
      field: str(c.field),
      operator: str(c.operator) as Condition['operator'],
      value: c.value === undefined || c.value === null ? undefined : String(c.value),
    }));

  const result = await exportRecords(ctx, str(body.objectApiName), {
    fields: body.fields as string[] | undefined,
    filters,
    filterLogic: str(body.filterLogic, 500) || undefined,
  });

  await createJob(ctx, result.access, {
    operation: 'export',
    fileName: result.fileName,
    total: result.count,
    succeeded: result.count,
    status: 'completed',
  });

  // BOM so Excel opens the UTF-8 file correctly (the Data Loader's parser strips it).
  return new Response('﻿' + result.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.fileName.replace(/[^A-Za-z0-9._-]/g, '_')}"`,
      'Cache-Control': 'no-store',
      'X-Row-Count': String(result.count),
      'X-Truncated': result.truncated ? 'true' : 'false',
    },
  });
});
