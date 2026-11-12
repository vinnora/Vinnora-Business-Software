import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MfgMaterial from '@/models/MfgMaterial';
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
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { materialCode: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await MfgMaterial.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching materials:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const item = await MfgMaterial.create({
      ...sanitize(body),
      ...t.stamp(),
      materialCode: body.materialCode || genCode('MAT'),
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating material:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MfgMaterial.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Material not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating material:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MfgMaterial.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Material not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting material:');
  }
}
