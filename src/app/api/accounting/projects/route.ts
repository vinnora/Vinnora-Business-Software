import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';

function generateProjectCode() {
  return 'PROJ-' + Date.now().toString().slice(-6);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    const filter: any = { userId };
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;

    const projects = await Project.find(filter).sort({ startDate: -1 }).limit(50);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
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
    const project = await Project.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await Project.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

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
      userId,
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
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
