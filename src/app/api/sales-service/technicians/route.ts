import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Technician from '@/models/Technician';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET() {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    const techs = await Technician.find(t.where()).sort({ name: 1 });
    return NextResponse.json(techs);
  } catch (error) {
    return apiError(error, 'Error fetching technicians:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const tech = await Technician.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(tech, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating technician:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const tech = await Technician.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!tech) throw new NotFoundError('Technician not found');
    return NextResponse.json(tech);
  } catch (error) {
    return apiError(error, 'Error updating technician:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await Technician.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Technician not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting technician:');
  }
}
