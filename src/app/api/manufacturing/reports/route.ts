import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import MfgWorkOrder from '@/models/MfgWorkOrder';
import MfgMaterial from '@/models/MfgMaterial';
import MfgMachine from '@/models/MfgMachine';
import MfgQualityCheck from '@/models/MfgQualityCheck';
import MfgSupplier from '@/models/MfgSupplier';
import MfgPurchaseRequisition from '@/models/MfgPurchaseRequisition';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'dashboard-summary': {
        const [
          totalWorkOrders,
          activeWorkOrders,
          totalMaterials,
          lowStockMaterials,
          totalMachines,
          operationalMachines,
          pendingQualityChecks,
          totalSuppliers,
          openRequisitions,
        ] = await Promise.all([
          MfgWorkOrder.countDocuments({ userId }),
          MfgWorkOrder.countDocuments({ userId, status: 'In Progress' }),
          MfgMaterial.countDocuments({ userId }),
          MfgMaterial.countDocuments({ userId, $expr: { $lte: ['$currentStock', '$reorderPoint'] } }),
          MfgMachine.countDocuments({ userId }),
          MfgMachine.countDocuments({ userId, status: 'Operational' }),
          MfgQualityCheck.countDocuments({ userId, status: 'Pending' }),
          MfgSupplier.countDocuments({ userId }),
          MfgPurchaseRequisition.countDocuments({ userId, status: 'Open' }),
        ]);
        return NextResponse.json({
          totalWorkOrders,
          activeWorkOrders,
          totalMaterials,
          lowStockMaterials,
          totalMachines,
          operationalMachines,
          pendingQualityChecks,
          totalSuppliers,
          openRequisitions,
        });
      }
      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Report failed' }, { status: 500 });
  }
}
