import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { ForbiddenError, getAuthContext } from '@/lib/auth-helpers';
import { readJson, route } from '@/lib/platform/api';
import { getEffectivePermissions } from '@/lib/platform/access';
import { tenantOf } from '@/lib/platform/metadata';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';
import { MAX_BATCH_ROWS, processBatch, type ImportOperation } from '@/lib/platform/data-loader';
import DataLoadJob from '@/models/DataLoadJob';

type P = { id: string };

/**
 * POST { rows: Record<fieldApiName, string>[] } — run one batch (≤ 200 rows) of a job.
 * Operation, object and match field come from the job. Returns { results, job }.
 */
export const POST = route<P>(async (req, { id }) => {
  const ctx = await getAuthContext();
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Job not found');
  const job = await DataLoadJob.findOne({ _id: id, orgId: tenantOf(ctx) });
  if (!job) throw new NotFoundError('Job not found');
  if (job.userId !== ctx.userId) throw new ForbiddenError('Only the user who started this job can load data into it.');
  if (job.operation === 'export') throw new BadRequestError('Export jobs have no batches.');
  if (job.status !== 'running') throw new BadRequestError('This job has already finished.');
  const perms = await getEffectivePermissions(ctx);
  if (!perms.system.importData) throw new ForbiddenError('You need the Import Data permission to use Import & Export.');

  const body = await readJson(req);
  if (!Array.isArray(body.rows)) throw new BadRequestError('rows must be an array');
  if (body.rows.length > MAX_BATCH_ROWS) throw new BadRequestError(`A batch can contain at most ${MAX_BATCH_ROWS} rows.`);
  const rows = (body.rows as unknown[]).map((r) =>
    r && typeof r === 'object' && !Array.isArray(r) ? (r as Record<string, unknown>) : {},
  );

  const results = await processBatch(ctx, job.objectApiName, job.operation as ImportOperation, rows, job.matchField || undefined);
  const succeeded = results.filter((r) => r.success).length;
  const updated = await DataLoadJob.findByIdAndUpdate(
    job._id,
    { $inc: { succeeded, failed: results.length - succeeded } },
    { returnDocument: 'after' },
  ).lean();
  return NextResponse.json({
    results,
    job: updated ? { succeeded: updated.succeeded, failed: updated.failed, total: updated.total } : undefined,
  });
});
