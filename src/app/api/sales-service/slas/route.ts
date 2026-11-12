import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SLA from '@/models/SLA';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET() {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    const slas = await SLA.find(t.where()).sort({ createdAt: -1 });
    return NextResponse.json(slas);
  } catch (error) {
    return apiError(error, 'Error fetching SLAs:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();

    const body = await req.json();
    if (!body.name || !body.firstResponseMinutes || !body.resolutionMinutes) {
      return NextResponse.json(
        { error: 'name, firstResponseMinutes, resolutionMinutes are required' },
        { status: 400 }
      );
    }

    const sla = await SLA.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(sla, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating SLA:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const sla = await SLA.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!sla) throw new NotFoundError('SLA not found');
    return NextResponse.json(sla);
  } catch (error) {
    return apiError(error, 'Error updating SLA:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await SLA.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('SLA not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting SLA:');
  }
}
