import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MfgWorkOrder from '@/models/MfgWorkOrder';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function genCode(prefix: string) {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}-${year}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { workOrderNumber: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await MfgWorkOrder.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching work orders:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    if (!body.productName || !body.quantity) {
      return NextResponse.json({ error: 'productName and quantity required' }, { status: 400 });
    }
    const item = await MfgWorkOrder.create({
      ...sanitize(body),
      ...t.stamp(),
      workOrderNumber: body.workOrderNumber || genCode('WO'),
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating work order:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MfgWorkOrder.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Work order not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating work order:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MfgWorkOrder.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Work order not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting work order:');
  }
}
