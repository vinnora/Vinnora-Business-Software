import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WorkOrder from '@/models/WorkOrder';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function generateWorkOrderNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `WO-${year}-${random}`;
}

type LineItem = { quantity?: number; unitPrice?: number };

function lineTotal(items: LineItem[]) {
  return items.reduce((s, l) => s + (l.quantity || 1) * (l.unitPrice || 0), 0);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technicianId');
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (technicianId) filter.technicianId = technicianId;
    const orders = await WorkOrder.find(t.where(filter)).sort({ scheduledStart: 1, createdAt: -1 }).limit(200);
    return NextResponse.json(orders);
  } catch (error) {
    return apiError(error, 'Error fetching work orders:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    if (!body.subject) {
      return NextResponse.json({ error: 'subject required' }, { status: 400 });
    }
    const subtotal = lineTotal(body.lineItems || []);
    const wo = await WorkOrder.create({
      ...sanitize(body),
      ...t.stamp(),
      workOrderNumber: generateWorkOrderNumber(),
      subtotal,
      total: subtotal,
    });
    return NextResponse.json(wo, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating work order:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const updates: Record<string, unknown> = sanitize(body);
    if (updates.status === 'In Progress' && !updates.actualStart) {
      updates.actualStart = new Date();
    }
    if (updates.status === 'Completed' && !updates.actualEnd) {
      updates.actualEnd = new Date();
    }
    if (Array.isArray(updates.lineItems)) {
      updates.subtotal = lineTotal(updates.lineItems as LineItem[]);
      updates.total = updates.subtotal;
    }
    const wo = await WorkOrder.findOneAndUpdate(t.where({ _id: id }), updates, { new: true, runValidators: true });
    if (!wo) throw new NotFoundError('Job card not found');
    return NextResponse.json(wo);
  } catch (error) {
    return apiError(error, 'Error updating work order:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await WorkOrder.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Job card not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting work order:');
  }
}
