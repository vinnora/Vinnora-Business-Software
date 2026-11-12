import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import EmailTemplate from '@/models/EmailTemplate';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET() {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    const templates = await EmailTemplate.find(t.where()).sort({ name: 1 });
    return NextResponse.json(templates);
  } catch (error) {
    return apiError(error, 'Error fetching templates:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.subject || !body.body) {
      return NextResponse.json({ error: 'name, subject, body required' }, { status: 400 });
    }
    const template = await EmailTemplate.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating template:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const template = await EmailTemplate.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!template) throw new NotFoundError('Template not found');
    return NextResponse.json(template);
  } catch (error) {
    return apiError(error, 'Error updating template:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await EmailTemplate.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Template not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting template:');
  }
}
