import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
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
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');

    const filter: any = { userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (accountId) filter.accountId = accountId;
    if (search) {
      filter.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const cases = await Case.find(filter).sort({ createdAt: -1 }).limit(200);
    return NextResponse.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    if (!body.subject) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }

    // Auto-attach SLA based on priority
    let slaDueAt: Date | undefined;
    let slaId: string | undefined;
    const priority = body.priority || 'Medium';
    const sla = await SLA.findOne({
      userId,
      active: true,
      appliesToPriority: priority,
    });
    if (sla) {
      slaId = String(sla._id);
      slaDueAt = new Date(Date.now() + sla.resolutionMinutes * 60 * 1000);
    }

    const newCase = await Case.create({
      ...body,
      userId,
      caseNumber: generateCaseNumber(),
      priority,
      slaId,
      slaDueAt,
    });
    await runWorkflows({ objectType: 'Case', event: 'created', record: newCase, userId });
    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, addComment, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });

    if (updates.status === 'Resolved' && !updates.resolvedAt) {
      updates.resolvedAt = new Date();
    }
    if (updates.status === 'Closed' && !updates.closedAt) {
      updates.closedAt = new Date();
    }

    let updated;
    if (addComment) {
      updated = await Case.findByIdAndUpdate(
        _id,
        { ...updates, $push: { comments: { ...addComment, createdAt: new Date() } } },
        { new: true }
      );
    } else {
      updated = await Case.findByIdAndUpdate(_id, updates, { new: true });
    }
    if (updated) {
      await runWorkflows({
        objectType: 'Case',
        event: 'fieldChanged',
        record: updated,
        userId: updated.userId,
        changedFields: Object.keys(updates),
      });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json({ error: 'Failed to update case' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await Case.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 });
  }
}
