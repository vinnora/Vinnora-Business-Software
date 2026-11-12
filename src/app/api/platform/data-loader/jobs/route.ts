import { NextResponse } from 'next/server';
import { ForbiddenError, getAuthContext } from '@/lib/auth-helpers';
import { readJson, route, str } from '@/lib/platform/api';
import { getEffectivePermissions } from '@/lib/platform/access';
import { tenantOf } from '@/lib/platform/metadata';
import { BadRequestError } from '@/lib/platform/errors';
import { IMPORT_OPERATIONS, connectedAccess, createJob, isMatchableField, jobDTO, type ImportOperation } from '@/lib/platform/data-loader';
import DataLoadJob from '@/models/DataLoadJob';

/** GET — last 50 Data Loader jobs in this environment (users without Import Data see only their own). */
export const GET = route(async () => {
  const ctx = await getAuthContext();
  const perms = await getEffectivePermissions(ctx);
  const filter: Record<string, unknown> = { orgId: tenantOf(ctx) };
  if (!perms.system.importData) filter.userId = ctx.userId;
  const jobs = await DataLoadJob.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json(jobs.map((j) => jobDTO(j as Record<string, unknown>)));
});

/** POST { objectApiName, operation, fileName, matchField, total } — start an import job. */
export const POST = route(async (req) => {
  const ctx = await getAuthContext();
  const perms = await getEffectivePermissions(ctx);
  const body = await readJson(req);
  const operation = str(body.operation) as ImportOperation;
  if (!IMPORT_OPERATIONS.includes(operation)) throw new BadRequestError('operation must be insert, update, upsert or delete');
  if (!perms.system.importData) throw new ForbiddenError('You need the Import Data permission to use the Data Loader.');

  const access = await connectedAccess(ctx, str(body.objectApiName));
  access.assert('read');
  if (operation === 'insert') access.assert('create');
  if (operation === 'update') access.assert('edit');
  if (operation === 'upsert') {
    access.assert('create');
    access.assert('edit');
  }
  if (operation === 'delete') access.assert('delete');

  let matchField: string | undefined;
  if (operation === 'update' || operation === 'upsert') {
    matchField = str(body.matchField) || '_id';
    if (!isMatchableField(access, matchField)) throw new BadRequestError(`${matchField} can't be used to match records.`);
  }

  const job = await createJob(ctx, access, {
    operation,
    fileName: str(body.fileName),
    matchField,
    total: Number(body.total) || 0,
  });
  return NextResponse.json(jobDTO(job.toObject()), { status: 201 });
});
