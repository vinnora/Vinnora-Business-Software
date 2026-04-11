import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Opportunity, { STAGE_PROBABILITY, OpportunityStage } from '@/models/Opportunity';
import { runWorkflows } from '@/lib/workflows';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');

    const filter: any = { userId };
    if (stage) filter.stage = stage;
    if (accountId) filter.accountId = accountId;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const opportunities = await Opportunity.find(filter).sort({ closeDate: 1 }).limit(200);
    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    if (!body.name || !body.closeDate) {
      return NextResponse.json(
        { error: 'name and closeDate are required' },
        { status: 400 }
      );
    }

    const stage = (body.stage || 'Prospecting') as OpportunityStage;
    const opportunity = await Opportunity.create({
      ...body,
      userId,
      stage,
      probability: STAGE_PROBABILITY[stage] ?? 10,
    });
    await runWorkflows({ objectType: 'Opportunity', event: 'created', record: opportunity, userId });
    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });

    if (updates.stage) {
      updates.probability = STAGE_PROBABILITY[updates.stage as OpportunityStage] ?? 10;
    }

    const opportunity = await Opportunity.findByIdAndUpdate(_id, updates, { new: true });
    if (opportunity) {
      await runWorkflows({
        objectType: 'Opportunity',
        event: 'fieldChanged',
        record: opportunity,
        userId: opportunity.userId,
        changedFields: Object.keys(updates),
      });
    }
    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await Opportunity.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 });
  }
}
