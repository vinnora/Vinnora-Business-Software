import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CustomFieldDef from '@/models/CustomFieldDef';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    const { searchParams } = new URL(req.url);
    const objectType = searchParams.get('objectType');
    const filter: Record<string, unknown> = {};
    if (objectType) filter.objectType = objectType;
    const fields = await CustomFieldDef.find(t.where(filter)).sort({ objectType: 1, order: 1 });
    return NextResponse.json(fields);
  } catch (error) {
    return apiError(error, 'Error fetching custom fields:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.objectType || !body.type) {
      return NextResponse.json(
        { error: 'name, objectType, type required' },
        { status: 400 }
      );
    }
    const apiName =
      body.apiName ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') + '__c';
    const f = await CustomFieldDef.create({ ...sanitize(body), ...t.stamp(), apiName });
    return NextResponse.json(f, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating custom field:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const f = await CustomFieldDef.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!f) throw new NotFoundError('Custom field not found');
    return NextResponse.json(f);
  } catch (error) {
    return apiError(error, 'Error updating custom field:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await CustomFieldDef.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Custom field not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting custom field:');
  }
}
