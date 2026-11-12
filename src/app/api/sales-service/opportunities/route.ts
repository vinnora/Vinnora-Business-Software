import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthContext } from '@/lib/auth-helpers';
import { getObjectAccess, buildCreateDoc, buildUpdate } from '@/lib/platform/access';
import { legacyOwnerKey, tenantOf } from '@/lib/platform/metadata';
import { BadRequestError, NotFoundError, platformErrorResponse } from '@/lib/platform/errors';
import Opportunity, { STAGE_PROBABILITY, OpportunityStage } from '@/models/Opportunity';
import { runWorkflows } from '@/lib/workflows';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Opportunity');
    access.assert('read');

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (stage) filter.stage = stage;
    if (accountId) filter.accountId = accountId;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const opportunities = await Opportunity.find({ $and: [await access.readFilter(), filter] })
      .sort({ closeDate: 1 })
      .limit(200);
    return NextResponse.json(access.shapeMany(opportunities));
  } catch (error) {
    return platformErrorResponse(error, 'Error fetching opportunities:');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Opportunity');
    // probability is derived from the stage server-side
    const body = await req.json();
    delete body.probability;

    const prepared = await access.prepareWrite(body, undefined, { passthrough: true });
    const stage = ((prepared.set.stage as string) || 'Prospecting') as OpportunityStage;
    const opportunity = await Opportunity.create(
      buildCreateDoc(access, prepared, { stage, probability: STAGE_PROBABILITY[stage] ?? 10 }),
    );
    await runWorkflows({
      objectType: 'Opportunity',
      event: 'created',
      record: opportunity,
      userId: legacyOwnerKey(ctx),
      orgId: tenantOf(ctx),
    });
    return NextResponse.json(access.shape(opportunity), { status: 201 });
  } catch (error) {
    return platformErrorResponse(error, 'Error creating opportunity:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Opportunity');
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) throw new BadRequestError('_id required');
    if (!mongoose.isValidObjectId(_id)) throw new BadRequestError('Invalid _id');

    const existing = await Opportunity.findOne({ $and: [{ _id }, await access.readFilter()] });
    if (!existing) throw new NotFoundError('Opportunity not found');

    if (updates.stage) delete updates.probability; // derived from stage below
    const prepared = await access.prepareWrite(updates, existing, { passthrough: true });

    const extraSet: Record<string, unknown> = {};
    if (prepared.set.stage !== undefined && prepared.set.stage !== null) {
      extraSet.probability = STAGE_PROBABILITY[prepared.set.stage as OpportunityStage] ?? 10;
    }

    const opportunity = await Opportunity.findByIdAndUpdate(_id, buildUpdate(access, prepared, extraSet), { new: true });
    if (opportunity) {
      await runWorkflows({
        objectType: 'Opportunity',
        event: 'fieldChanged',
        record: opportunity,
        userId: legacyOwnerKey(ctx),
        orgId: tenantOf(ctx),
        changedFields: prepared.changed,
      });
    }
    return NextResponse.json(access.shape(opportunity));
  } catch (error) {
    return platformErrorResponse(error, 'Error updating opportunity:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Opportunity');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new BadRequestError('id required');
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid id');

    const existing = await Opportunity.findOne({ $and: [{ _id: id }, await access.readFilter()] });
    if (!existing) throw new NotFoundError('Opportunity not found');
    access.assert('delete');

    await Opportunity.deleteOne({ _id: existing._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return platformErrorResponse(error, 'Error deleting opportunity:');
  }
}
