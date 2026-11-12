import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { ForbiddenError, getAuthContext } from '@/lib/auth-helpers';
import { readJson, route } from '@/lib/platform/api';
import { tenantOf } from '@/lib/platform/metadata';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';
import { jobDTO } from '@/lib/platform/data-loader';
import DataLoadJob from '@/models/DataLoadJob';

type P = { id: string };

/** PATCH { status: 'completed' } — finish a job (owner only). */
export const PATCH = route<P>(async (req, { id }) => {
  const ctx = await getAuthContext();
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Job not found');
  const body = await readJson(req);
  if (body.status !== 'completed') throw new BadRequestError("status must be 'completed'");
  const job = await DataLoadJob.findOne({ _id: id, orgId: tenantOf(ctx) });
  if (!job) throw new NotFoundError('Job not found');
  if (job.userId !== ctx.userId) throw new ForbiddenError('Only the user who started this job can update it.');
  job.status = 'completed';
  await job.save();
  return NextResponse.json(jobDTO(job.toObject()));
});
