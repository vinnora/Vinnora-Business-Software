import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktEmailTemplate from '@/models/MktEmailTemplate';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await MktEmailTemplate.find(t.where(filter)).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching email templates:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.subject || !body.bodyHtml) {
      return NextResponse.json({ error: 'name, subject and bodyHtml required' }, { status: 400 });
    }
    const item = await MktEmailTemplate.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating email template:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MktEmailTemplate.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Email template not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating email template:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MktEmailTemplate.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Email template not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting email template:');
  }
}
