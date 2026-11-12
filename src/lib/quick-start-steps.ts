import type { QuickStartStep } from '@/components/QuickStart';

export type ModuleQuickStart = {
  name: string;
  accentFrom: string;
  accentTo: string;
  steps: QuickStartStep[];
};

export const QUICK_START: Record<string, ModuleQuickStart> = {
  accounting: {
    name: 'Accounting',
    accentFrom: '#1B4332',
    accentTo: '#40916C',
    steps: [
      {
        title: 'Set up your Chart of Accounts',
        body: 'Start in Chart of Accounts to define the ledger accounts your business will use — assets, liabilities, income, and expenses. Everything downstream posts against these.',
      },
      {
        title: 'Configure taxes',
        body: 'Open Taxes to add the tax rates and rules that apply to your region so invoices, bills, and transactions calculate correctly from day one.',
      },
      {
        title: 'Record transactions, invoices and bills',
        body: 'Use Transactions for journal entries, Invoices for money owed to you, and Bills for money you owe. Each entry flows straight into the General Ledger.',
      },
      {
        title: 'Review reports',
        body: 'Head to Reports for P&L, balance sheet and cash flow. Once data is flowing you can layer in Budgets, Projects, Assets and Payroll as needed.',
      },
    ],
  },
  hrm: {
    name: 'HRM',
    accentFrom: '#2C2620',
    accentTo: '#8B6F47',
    steps: [
      {
        title: 'Add departments and employees',
        body: 'Begin with Employees to create your people directory. Assign departments, roles and reporting lines so the rest of HRM has structure to work with.',
      },
      {
        title: 'Configure leave and attendance',
        body: 'Set up leave policies and attendance rules so employees can log time off and daily attendance against consistent defaults.',
      },
      {
        title: 'Run recruitment and onboarding',
        body: 'Post openings in Recruitment, track applicants, and move new hires through Onboarding checklists in one place.',
      },
      {
        title: 'Process payroll and reviews',
        body: 'When attendance and leave data are flowing, run Payroll and schedule Performance reviews. Analytics ties it all together.',
      },
    ],
  },
  inventory: {
    name: 'Inventory',
    accentFrom: '#4A1D0F',
    accentTo: '#E2671A',
    steps: [
      {
        title: 'Create warehouses',
        body: 'Start in Warehouses to define the physical locations where stock is held. Every item balance is tracked against a warehouse.',
      },
      {
        title: 'Add suppliers and items',
        body: 'Add your Suppliers, then create Items with SKUs, units and reorder points. This is the master data everything else depends on.',
      },
      {
        title: 'Receive stock with purchase orders',
        body: 'Raise Purchase Orders to suppliers. When goods arrive, receive them to push stock into a warehouse and update on-hand quantities.',
      },
      {
        title: 'Stay accurate with audits and transfers',
        body: 'Use Stock Transfers to move items between warehouses, and Cycle Counts or Stock Audits to keep your on-hand numbers honest.',
      },
    ],
  },
  manufacturing: {
    name: 'Manufacturing',
    accentFrom: '#1C1C1E',
    accentTo: '#4A4E54',
    steps: [
      {
        title: 'Set up materials and machines',
        body: 'Add raw Materials and the Machines on your shop floor. These are the building blocks every work order will consume and run on.',
      },
      {
        title: 'Define your BOMs',
        body: 'Create a Bill of Materials for each finished product so the system knows exactly what inputs a work order needs.',
      },
      {
        title: 'Raise work orders',
        body: 'Open Work Orders to schedule production against a BOM and machine. Production Logs capture real-time output and consumption.',
      },
      {
        title: 'Check quality and trace',
        body: 'Use Quality Checks to gate output and Traceability to link materials, batches and orders end-to-end when you need to investigate.',
      },
    ],
  },
  marketing: {
    name: 'Marketing',
    accentFrom: '#3D5266',
    accentTo: '#5A7A8C',
    steps: [
      {
        title: 'Import enquiries and build segments',
        body: 'Bring your Enquiries in and group them into Audience Segments. Segments power every promotion, email and automation downstream.',
      },
      {
        title: 'Create email and SMS templates',
        body: 'Draft reusable Email templates and SMS messages so you are not rewriting copy for every send.',
      },
      {
        title: 'Launch a promotion',
        body: 'Open Promotions to combine a segment with templates and schedule your first send. Events and Surveys are available when you need richer touchpoints.',
      },
      {
        title: 'Automate and measure',
        body: 'Set up Automations for repeatable flows, then watch Analytics to see what is working and iterate.',
      },
    ],
  },
  'sales-service': {
    name: 'Sell & Support',
    accentFrom: '#012A4A',
    accentTo: '#0096C7',
    steps: [
      {
        title: 'Add companies and people',
        body: 'Start with Companies and People. This is the foundation every enquiry, deal and ticket connects back to.',
      },
      {
        title: 'Capture enquiries and qualify',
        body: 'Log inbound Enquiries, qualify them, then convert promising ones into Deals tied to a company.',
      },
      {
        title: 'Work deals through the pipeline',
        body: 'Move Deals through deal stages, log Follow-ups along the way, and close the deal when ready.',
      },
      {
        title: 'Support customers with tickets',
        body: 'After the sale, use Tickets, Help Library articles and Field job cards to keep customers happy and track every interaction.',
      },
    ],
  },
};
