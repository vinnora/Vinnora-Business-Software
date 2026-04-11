import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Invoice from '@/models/Invoice';
import Bill from '@/models/Bill';
import Asset from '@/models/Asset';
import GeneralLedger from '@/models/GeneralLedger';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let report: any = {};

    switch (reportType) {
      case 'income-statement': {
        // Income Statement (P&L)
        const transactions = await Transaction.find({
          userId,
          status: 'posted',
          ...(Object.keys(dateFilter).length && { date: dateFilter }),
        });

        const income = transactions
          .filter((t) => t.transactionType === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
          .filter((t) => t.transactionType === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        report = {
          type: 'income-statement',
          revenue: income,
          expenses,
          netIncome: income - expenses,
          period: `${startDate} to ${endDate}`,
        };
        break;
      }

      case 'balance-sheet': {
        // Simplified Balance Sheet
        const allTransactions = await Transaction.find({ userId });
        const assetAmount = allTransactions
          .filter((t) => t.transactionType === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const liabilities = allTransactions
          .filter((t) => t.transactionType === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        report = {
          type: 'balance-sheet',
          assets: assetAmount,
          liabilities,
          equity: assetAmount - liabilities,
        };
        break;
      }

      case 'receivables': {
        // Aging of Receivables
        const invoices = await Invoice.find({
          userId,
          status: { $in: ['sent', 'partial', 'overdue'] },
        });

        const aging = {
          current: invoices.filter(
            (inv) =>
              inv.dueDate.getTime() > new Date().getTime()
          ).length,
          overdue30: invoices.filter((inv) => {
            const days =
              (new Date().getTime() - inv.dueDate.getTime()) /
              (1000 * 60 * 60 * 24);
            return days > 0 && days <= 30;
          }).length,
          overdue60: invoices.filter((inv) => {
            const days =
              (new Date().getTime() - inv.dueDate.getTime()) /
              (1000 * 60 * 60 * 24);
            return days > 30 && days <= 60;
          }).length,
          overdue90: invoices.filter((inv) => {
            const days =
              (new Date().getTime() - inv.dueDate.getTime()) /
              (1000 * 60 * 60 * 24);
            return days > 60;
          }).length,
        };

        report = {
          type: 'receivables-aging',
          totalOutstanding: invoices.reduce((sum, inv) => sum + inv.amountDue, 0),
          aging,
        };
        break;
      }

      case 'payables': {
        // Aging of Payables
        const bills = await Bill.find({
          userId,
          status: { $in: ['received', 'partial', 'overdue'] },
        });

        const billAging = {
          current: bills.filter((bill) => bill.dueDate.getTime() > new Date().getTime())
            .length,
          overdue30: bills.filter((bill) => {
            const days = (new Date().getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24);
            return days > 0 && days <= 30;
          }).length,
          overdue60: bills.filter((bill) => {
            const days = (new Date().getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24);
            return days > 30 && days <= 60;
          }).length,
          overdue90: bills.filter((bill) => {
            const days = (new Date().getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24);
            return days > 60;
          }).length,
        };

        report = {
          type: 'payables-aging',
          totalOutstanding: bills.reduce((sum, bill) => sum + bill.amountDue, 0),
          aging: billAging,
        };
        break;
      }

      case 'asset-summary': {
        const fixedAssets = await Asset.find({ userId, status: 'active' });
        report = {
          type: 'asset-summary',
          totalAssets: fixedAssets.length,
          totalOriginalCost: fixedAssets.reduce((sum, a) => sum + a.originalCost, 0),
          totalDepreciation: fixedAssets.reduce((sum, a) => sum + a.depreciation, 0),
          totalBookValue: fixedAssets.reduce((sum, a) => sum + a.bookValue, 0),
          byCategory: fixedAssets.reduce((acc: any, a) => {
            acc[a.category] = (acc[a.category] || 0) + 1;
            return acc;
          }, {}),
        };
        break;
      }

      default:
        report = {
          type: 'dashboard-summary',
          totalInvoices: await Invoice.countDocuments({ userId }),
          totalBills: await Bill.countDocuments({ userId }),
          totalTransactions: await Transaction.countDocuments({ userId }),
          totalAssets: await Asset.countDocuments({ userId, status: 'active' }),
        };
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      {
        type: 'error',
        message: 'Report generation failed',
        data: {},
      },
      { status: 200 }
    );
  }
}
