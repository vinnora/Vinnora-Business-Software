import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import WorkOrder from '@/models/WorkOrder';

function generateWorkOrderNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `WO-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technicianId');
    const filter: any = { userId };
    if (status) filter.status = status;
    if (technicianId) filter.technicianId = technicianId;
    const orders = await WorkOrder.find(filter).sort({ scheduledStart: 1, createdAt: -1 }).limit(200);
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
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
      return NextResponse.json({ error: 'subject required' }, { status: 400 });
    }
    const subtotal = (body.lineItems || []).reduce(
      (s: number, l: any) => s + (l.quantity || 1) * (l.unitPrice || 0),
      0
    );
    const wo = await WorkOrder.create({
      ...body,
      userId,
      workOrderNumber: generateWorkOrderNumber(),
      subtotal,
      total: subtotal,
    });
    return NextResponse.json(wo, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ error: 'Failed to create job card' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    if (updates.status === 'In Progress' && !updates.actualStart) {
      updates.actualStart = new Date();
    }
    if (updates.status === 'Completed' && !updates.actualEnd) {
      updates.actualEnd = new Date();
    }
    if (updates.lineItems) {
      updates.subtotal = updates.lineItems.reduce(
        (s: number, l: any) => s + (l.quantity || 1) * (l.unitPrice || 0),
        0
      );
      updates.total = updates.subtotal;
    }
    const wo = await WorkOrder.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(wo);
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
    await WorkOrder.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
