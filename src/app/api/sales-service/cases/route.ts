import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthContext } from '@/lib/auth-helpers';
import { getObjectAccess, buildCreateDoc, buildUpdate } from '@/lib/platform/access';
import { legacyOwnerKey, tenantOf } from '@/lib/platform/metadata';
import { BadRequestError, NotFoundError, platformErrorResponse } from '@/lib/platform/errors';
import Case from '@/models/Case';
import SLA from '@/models/SLA';
import { runWorkflows } from '@/lib/workflows';

function generateCaseNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `CASE-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Case');
    access.assert('read');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (accountId) filter.accountId = accountId;
    if (search) {
      filter.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const cases = await Case.find({ $and: [await access.readFilter(), filter] })
      .sort({ createdAt: -1 })
      .limit(200);
    return NextResponse.json(access.shapeMany(cases));
  } catch (error) {
    return platformErrorResponse(error, 'Error fetching cases:');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Case');
    // Server-maintained fields; clients can't supply them on create.
    const body = await req.json();
    delete body.caseNumber;
    delete body.slaId;
    delete body.slaDueAt;

    const prepared = await access.prepareWrite(body, undefined, { passthrough: true });

    // Auto-attach SLA based on priority
    const priority = (prepared.set.priority as string) || 'Medium';
    const extra: Record<string, unknown> = { caseNumber: generateCaseNumber(), priority };
    const sla = await SLA.findOne({
      $or: [{ orgId: tenantOf(ctx) }, { userId: legacyOwnerKey(ctx) }],
      active: true,
      appliesToPriority: priority,
    });
    if (sla) {
      extra.slaId = String(sla._id);
      extra.slaDueAt = new Date(Date.now() + sla.resolutionMinutes * 60 * 1000);
    }

    const newCase = await Case.create(buildCreateDoc(access, prepared, extra));
    await runWorkflows({
      objectType: 'Case',
      event: 'created',
      record: newCase,
      userId: legacyOwnerKey(ctx),
      orgId: tenantOf(ctx),
    });
    return NextResponse.json(access.shape(newCase), { status: 201 });
  } catch (error) {
    return platformErrorResponse(error, 'Error creating case:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Case');
    const body = await req.json();
    const { _id, addComment, ...updates } = body;
    if (!_id) throw new BadRequestError('_id required');
    if (!mongoose.isValidObjectId(_id)) throw new BadRequestError('Invalid _id');

    const existing = await Case.findOne({ $and: [{ _id }, await access.readFilter()] });
    if (!existing) throw new NotFoundError('Case not found');

    const prepared = await access.prepareWrite(updates, existing, { passthrough: true });

    const extraSet: Record<string, unknown> = {};
    if (prepared.set.status === 'Resolved' && !updates.resolvedAt) extraSet.resolvedAt = new Date();
    if (prepared.set.status === 'Closed' && !updates.closedAt) extraSet.closedAt = new Date();

    const update: Record<string, unknown> = buildUpdate(access, prepared, extraSet);
    if (addComment) {
      update.$push = {
        comments: {
          ...addComment,
          authorId: addComment.authorId || ctx.userId,
          authorName: addComment.authorName || ctx.user?.name || ctx.user?.email || '',
          createdAt: new Date(),
        },
      };
    }

    const updated = await Case.findByIdAndUpdate(_id, update, { new: true });
    if (updated) {
      await runWorkflows({
        objectType: 'Case',
        event: 'fieldChanged',
        record: updated,
        userId: legacyOwnerKey(ctx),
        orgId: tenantOf(ctx),
        changedFields: prepared.changed,
      });
    }
    return NextResponse.json(access.shape(updated));
  } catch (error) {
    return platformErrorResponse(error, 'Error updating case:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Case');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new BadRequestError('id required');
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid id');

    const existing = await Case.findOne({ $and: [{ _id: id }, await access.readFilter()] });
    if (!existing) throw new NotFoundError('Case not found');
    access.assert('delete');

    await Case.deleteOne({ _id: existing._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return platformErrorResponse(error, 'Error deleting case:');
  }
}
