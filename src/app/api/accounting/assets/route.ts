import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Asset from '@/models/Asset';
import { runAccountingWorkflows } from '@/lib/accounting-workflows';

function generateAssetNumber() {
  return 'AST-' + Date.now().toString().slice(-6);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const filter: any = { userId };
    if (category) filter.category = category;
    if (status) filter.status = status;

    const assets = await Asset.find(filter).sort({ purchaseDate: -1 }).limit(50);
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const asset = await Asset.findByIdAndUpdate(_id, updates, { new: true });
    if (asset) {
      await runAccountingWorkflows({ objectType: 'Asset', event: 'fieldChanged', record: asset, userId: asset.userId, changedFields: Object.keys(updates) });
    }
    return NextResponse.json(asset);
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
    await Asset.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    const {
      assetName,
      category,
      originalCost,
      purchaseDate,
      usefulLife,
      salvageValue,
      depreciationMethod,
      location,
      assignedTo,
      description,
      notes,
    } = body;

    if (!assetName || !category || !originalCost || !purchaseDate || !usefulLife) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate depreciation and book value
    const monthsOwned =
      (new Date().getTime() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const totalDepreciable = originalCost - salvageValue;
    const monthlyDepreciation = totalDepreciable / (usefulLife * 12);
    const totalDepreciation = monthlyDepreciation * monthsOwned;
    const bookValue = originalCost - totalDepreciation;

    const asset = new Asset({
      userId,
      assetName,
      assetNumber: generateAssetNumber(),
      category,
      description,
      originalCost,
      purchaseDate,
      usefulLife,
      depreciation: totalDepreciation,
      bookValue: Math.max(0, bookValue),
      salvageValue: salvageValue || 0,
      depreciationMethod: depreciationMethod || 'straight-line',
      location,
      assignedTo,
      condition: 'good',
      status: 'active',
      notes,
    });

    await asset.save();
    await runAccountingWorkflows({ objectType: 'Asset', event: 'created', record: asset, userId });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
