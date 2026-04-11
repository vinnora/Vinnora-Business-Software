import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import EWayBill from '@/models/EWayBill';

function genEWBNumber() {
  // 12-digit EWB number simulation
  return Math.floor(Math.random() * 1e12).toString().padStart(12, '0');
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const filter: any = { userId };
    if (status) filter.status = status;
    const items = await EWayBill.find(filter).sort({ ewbDate: -1 }).limit(200);
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const body = await req.json();
    if (!body.fromGstin || !body.toGstin || !body.documentNumber || !body.items?.length) {
      return NextResponse.json(
        { error: 'fromGstin, toGstin, documentNumber, items required' },
        { status: 400 }
      );
    }

    // Calculate totals from items
    let totalTaxableValue = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let cess = 0;
    for (const it of body.items) {
      totalTaxableValue += it.taxableValue || 0;
      cgst += ((it.taxableValue || 0) * (it.cgstRate || 0)) / 100;
      sgst += ((it.taxableValue || 0) * (it.sgstRate || 0)) / 100;
      igst += ((it.taxableValue || 0) * (it.igstRate || 0)) / 100;
      cess += ((it.taxableValue || 0) * (it.cessRate || 0)) / 100;
    }
    const totalValue = totalTaxableValue + cgst + sgst + igst + cess;

    // EWB validity rule: 1 day per 200 km (regular vehicle) - simplified
    const validityDays = Math.max(1, Math.ceil((body.distanceKm || 100) / 200));
    const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    const ewb = await EWayBill.create({
      ...body,
      userId,
      ewayBillNumber: body.ewayBillNumber || genEWBNumber(),
      totalTaxableValue,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      cessAmount: cess,
      totalValue,
      validUntil,
      status: 'generated',
    });
    return NextResponse.json(ewb, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const ewb = await EWayBill.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(ewb);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await EWayBill.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
