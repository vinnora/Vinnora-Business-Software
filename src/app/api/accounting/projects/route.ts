import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function generateProjectCode() {
  return 'PROJ-' + Date.now().toString().slice(-6);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;

    const projects = await Project.find(t.where(filter)).sort({ startDate: -1 }).limit(50);
    return NextResponse.json(projects);
  } catch (error) {
    return apiError(error, 'Error fetching projects:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const updates: Record<string, any> = sanitize(body);
    if (updates.budget) {
      updates.totalBudget = updates.budget.reduce(
        (s: number, b: any) => s + (b.budgetAmount || 0),
        0
      );
      updates.totalSpent = updates.budget.reduce(
        (s: number, b: any) => s + (b.actualSpent || 0),
        0
      );
    }
    const project = await Project.findOneAndUpdate(t.where({ _id: recordId(body._id) }), updates, {
      new: true,
      runValidators: true,
    });
    if (!project) throw new NotFoundError('Project not found');
    return NextResponse.json(project);
  } catch (error) {
    return apiError(error, 'Error updating project:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await Project.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Project not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting project:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    const {
      projectName,
      clientId,
      clientName,
      startDate,
      endDate,
      budget,
      projectManager,
      description,
      notes,
    } = body;

    if (!projectName || !clientId || !clientName || !startDate || !endDate || !budget) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const totalBudget = budget.reduce((sum: number, b: any) => sum + b.budgetAmount, 0);

    const project = new Project({
      ...t.stamp(),
      projectName,
      projectCode: generateProjectCode(),
      clientId,
      clientName,
      startDate,
      endDate,
      projectManager,
      description,
      budget,
      totalBudget,
      totalSpent: 0,
      currency: 'INR',
      status: 'planning',
      notes,
    });

    await project.save();
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating project:');
  }
}
