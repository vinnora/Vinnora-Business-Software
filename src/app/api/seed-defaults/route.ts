import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import WorkflowRule from '@/models/WorkflowRule';
import InventoryWorkflowRule from '@/models/InventoryWorkflowRule';
import AccountingWorkflowRule from '@/models/AccountingWorkflowRule';
import HrmWorkflowRule from '@/models/HrmWorkflowRule';
import MktAutomation from '@/models/MktAutomation';
import MfgWorkflowRule from '@/models/MfgWorkflowRule';
import AppIntegration from '@/models/AppIntegration';
import AppConnection from '@/models/AppConnection';

const SALES_DEFAULTS = [
  { name: 'Auto-assign new enquiries', description: 'Assigns a default owner to every new enquiry', objectType: 'Lead', triggerEvent: 'created', conditions: [], conditionLogic: 'AND', actions: [{ type: 'assignOwner', params: { ownerName: 'Sales Team' } }] },
  { name: 'Notify on hot enquiry', description: 'Send email alert when an enquiry is rated Hot', objectType: 'Lead', triggerEvent: 'fieldChanged', watchFields: ['rating'], conditions: [{ field: 'rating', operator: 'equals', value: 'Hot' }], conditionLogic: 'AND', actions: [{ type: 'sendEmail', params: { subject: 'Hot Enquiry: {{firstName}} {{lastName}}', body: '{{firstName}} {{lastName}} at {{company}} has been rated Hot.' } }] },
  { name: 'Escalate high-priority tickets', description: 'Create a to-do for high-priority tickets', objectType: 'Case', triggerEvent: 'created', conditions: [{ field: 'priority', operator: 'equals', value: 'High' }], conditionLogic: 'AND', actions: [{ type: 'createActivity', params: { type: 'Task', subject: 'Urgent: Review ticket {{caseNumber}}', priority: 'High', dueInDays: 1 } }] },
  { name: 'Welcome email on new person', description: 'Send welcome email when a person is created', objectType: 'Contact', triggerEvent: 'created', conditions: [], conditionLogic: 'AND', actions: [{ type: 'sendEmail', params: { subject: 'Welcome, {{firstName}}!', body: 'Thank you for connecting with us.' } }] },
  { name: 'Celebrate closed-won deals', description: 'Log a follow-up when a deal is closed won', objectType: 'Opportunity', triggerEvent: 'fieldChanged', watchFields: ['stage'], conditions: [{ field: 'stage', operator: 'equals', value: 'Closed Won' }], conditionLogic: 'AND', actions: [{ type: 'createActivity', params: { type: 'Note', subject: 'Deal Won: {{name}} - {{amount}}' } }] },
];

const INVENTORY_DEFAULTS = [
  { name: 'Auto-reorder on low stock', description: 'Create PO when stock falls below reorder point', objectType: 'Item', triggerEvent: 'lowStock', conditions: [], conditionLogic: 'AND', actions: [{ type: 'createPurchaseOrder', params: { quantity: '{{reorderQuantity}}' } }] },
  { name: 'Alert on out of stock', description: 'Send alert when item stock hits zero', objectType: 'Item', triggerEvent: 'outOfStock', conditions: [], conditionLogic: 'AND', actions: [{ type: 'sendAlert', params: { message: 'OUT OF STOCK: {{name}} ({{itemCode}})' } }] },
  { name: 'Expiry warning', description: 'Email alert for items expiring within 30 days', objectType: 'Item', triggerEvent: 'expiringSoon', conditions: [], conditionLogic: 'AND', actions: [{ type: 'sendEmail', params: { subject: 'Expiry Warning: {{name}}', body: '{{name}} ({{itemCode}}) is expiring soon.' } }] },
  { name: 'Log new item creation', description: 'Log every new item added to inventory', objectType: 'Item', triggerEvent: 'created', conditions: [], conditionLogic: 'AND', actions: [{ type: 'logEvent', params: { message: 'New item created: {{name}} ({{itemCode}})' } }] },
  { name: 'Notify on PO received', description: 'Alert when purchase order goods are received', objectType: 'PurchaseOrder', triggerEvent: 'received', conditions: [], conditionLogic: 'AND', actions: [{ type: 'sendAlert', params: { message: 'PO received: {{poNumber}}' } }] },
];

const ACCOUNTING_DEFAULTS = [
  { name: 'Flag overdue invoices', description: 'Mark invoices as overdue after 30 days', objectType: 'Invoice', triggerEvent: 'fieldChanged', watchFields: ['status'], conditions: [{ field: 'status', operator: 'equals', value: 'sent' }], conditionLogic: 'AND', actions: [{ type: 'flagForReview', params: { message: 'Invoice may be overdue' } }] },
  { name: 'Notify on large transaction', description: 'Alert when transaction exceeds 1 lakh', objectType: 'Transaction', triggerEvent: 'created', conditions: [{ field: 'amount', operator: 'greaterThan', value: 100000 }], conditionLogic: 'AND', actions: [{ type: 'sendEmail', params: { subject: 'Large transaction: {{amount}}', body: 'A transaction of {{amount}} was recorded.' } }] },
  { name: 'Review new expenses', description: 'Create review task for expense transactions', objectType: 'Transaction', triggerEvent: 'created', conditions: [{ field: 'type', operator: 'equals', value: 'expense' }], conditionLogic: 'AND', actions: [{ type: 'createActivity', params: { subject: 'Review expense: {{description}}' } }] },
  { name: 'Bill payment reminder', description: 'Notify when a bill is approaching due date', objectType: 'Bill', triggerEvent: 'fieldChanged', watchFields: ['status', 'dueDate'], conditions: [], conditionLogic: 'AND', actions: [{ type: 'notify', params: { message: 'Bill {{billNumber}} is due soon' } }] },
];

const MARKETING_DEFAULTS = [
  { name: 'Welcome email for new enquiries', description: 'Send welcome email when a Marketing enquiry is captured', triggerType: 'leadCreated', triggerConfig: {}, steps: [{ stepId: 's1', order: 1, type: 'sendEmail', config: { subject: 'Welcome!', body: 'Thanks for your interest.' } }] },
  { name: 'Score boost on email click', description: 'Increase enquiry score when they click an email', triggerType: 'emailClicked', triggerConfig: {}, steps: [{ stepId: 's1', order: 1, type: 'updateLead', config: { field: 'score', operation: 'increment', value: 10 } }] },
  { name: 'Nurture sequence', description: '3-step email drip for new enquiries', triggerType: 'leadCreated', triggerConfig: {}, steps: [{ stepId: 's1', order: 1, type: 'wait', config: { delayDays: 3 } }, { stepId: 's2', order: 2, type: 'sendEmail', config: { subject: 'Did you know?', body: 'Learn more about our platform.' } }, { stepId: 's3', order: 3, type: 'wait', config: { delayDays: 7 } }, { stepId: 's4', order: 4, type: 'sendEmail', config: { subject: 'Special offer', body: 'Get started with a free trial.' } }] },
  { name: 'Event registration confirmation', description: 'Email confirmation on event signup', triggerType: 'eventRegistered', triggerConfig: {}, steps: [{ stepId: 's1', order: 1, type: 'sendEmail', config: { subject: 'Registration confirmed!', body: 'You are registered for the event.' } }] },
];

const HRM_DEFAULTS = [
  { name: 'Onboarding checklist on new hire', description: 'Trigger onboarding workflow when a new employee is created', objectType: 'Employee', triggerEvent: 'created', conditions: [], conditionLogic: 'AND', actions: [{ type: 'createOnboarding', params: {} }] },
  { name: 'Notify manager on leave request', description: 'Send email to manager when leave is requested', objectType: 'LeaveRequest', triggerEvent: 'created', conditions: [], conditionLogic: 'AND', actions: [{ type: 'sendEmail', params: { subject: 'Leave request from {{employeeName}}', body: '{{employeeName}} has requested {{leaveType}} from {{startDate}} to {{endDate}} ({{days}} days).' } }] },
  { name: 'Probation review reminder', description: 'Create task for probation review', objectType: 'Employee', triggerEvent: 'created', conditions: [{ field: 'employmentType', operator: 'equals', value: 'Probation' }], conditionLogic: 'AND', actions: [{ type: 'createActivity', params: { subject: 'Probation review for {{firstName}} {{lastName}}', dueInDays: 180 } }] },
  { name: 'Exit interview task', description: 'Create exit interview task on resignation', objectType: 'Employee', triggerEvent: 'fieldChanged', watchFields: ['status'], conditions: [{ field: 'status', operator: 'equals', value: 'Resigned' }], conditionLogic: 'AND', actions: [{ type: 'createActivity', params: { subject: 'Exit interview: {{firstName}} {{lastName}}', dueInDays: 7 } }] },
];

const MFG_DEFAULTS = [
  { name: 'QC check on work order completion', description: 'Auto-create quality check when work order is completed', objectType: 'WorkOrder', triggerEvent: 'completed', conditions: [], conditionLogic: 'AND', actions: [{ type: 'createQualityCheck', params: {} }] },
  { name: 'Notify on quality failure', description: 'Send email alert when a quality check fails', objectType: 'QualityCheck', triggerEvent: 'fieldChanged', watchFields: ['status'], conditions: [{ field: 'status', operator: 'equals', value: 'Failed' }], conditionLogic: 'AND', actions: [{ type: 'sendEmail', params: { subject: 'QC Failed: {{productName}}', body: 'Quality check failed for {{productName}}. Defects: {{defectsFound}}.' } }] },
  { name: 'Low stock material alert', description: 'Notify when raw material stock falls below reorder point', objectType: 'Material', triggerEvent: 'fieldChanged', watchFields: ['currentStock'], conditions: [], conditionLogic: 'AND', actions: [{ type: 'notify', params: { message: 'Low stock: {{name}} ({{materialCode}}) — {{currentStock}} remaining' } }] },
  { name: 'Log work order start', description: 'Log event when work order moves to In Progress', objectType: 'WorkOrder', triggerEvent: 'fieldChanged', watchFields: ['status'], conditions: [{ field: 'status', operator: 'equals', value: 'In Progress' }], conditionLogic: 'AND', actions: [{ type: 'notify', params: { message: 'Work order started: {{workOrderNumber}} — {{productName}}' } }] },
];

const DEFAULT_INTEGRATIONS = [
  // Global (available to all apps)
  { app: 'global', name: 'WhatsApp Business', type: 'whatsapp', description: 'Send WhatsApp messages via Cloud API', config: { apiKey: '', phoneNumberId: '', webhookVerifyToken: '' } },
  { app: 'global', name: 'Email / SMTP', type: 'email-smtp', description: 'Send emails via SMTP', config: { host: '', port: 587, user: '', pass: '', from: '' } },
  { app: 'global', name: 'Outbound Webhook', type: 'webhook', description: 'POST events to your endpoint', config: { url: '', secret: '' } },
  // Sell & Support (sales-service)
  { app: 'sales-service', name: 'Zoho CRM', type: 'zoho-crm', description: 'Sync contacts and deals with Zoho CRM', config: { clientId: '', clientSecret: '', refreshToken: '' } },
  { app: 'sales-service', name: 'Freshdesk', type: 'freshdesk', description: 'Sync tickets with Freshdesk', config: { domain: '', apiKey: '' } },
  // Accounting
  { app: 'accounting', name: 'Tally', type: 'tally', description: 'Sync with Tally ERP', config: { host: 'localhost', port: 9000 } },
  { app: 'accounting', name: 'Zoho Books', type: 'zoho-books', description: 'Sync invoices with Zoho Books', config: { orgId: '', clientId: '', clientSecret: '' } },
  { app: 'accounting', name: 'QuickBooks', type: 'quickbooks', description: 'Sync with QuickBooks Online', config: { clientId: '', clientSecret: '', realmId: '' } },
  { app: 'accounting', name: 'Bank Feed', type: 'bank-feed', description: 'Auto-import bank statements', config: { bankName: '', accountNumber: '', ifsc: '' } },
  // Inventory
  { app: 'inventory', name: 'ShipRocket', type: 'shiprocket', description: 'Ship orders via ShipRocket', config: { email: '', password: '' } },
  { app: 'inventory', name: 'Delhivery', type: 'delhivery', description: 'Ship via Delhivery', config: { apiToken: '', clientName: '' } },
  // Marketing (marketing)
  { app: 'marketing', name: 'Mailchimp', type: 'mailchimp', description: 'Sync audiences with Mailchimp', config: { apiKey: '', server: '' } },
  { app: 'marketing', name: 'SendGrid', type: 'sendgrid', description: 'Send transactional emails via SendGrid', config: { apiKey: '' } },
  // HRM
  { app: 'hrm', name: 'Slack', type: 'slack', description: 'Post HR notifications to Slack', config: { webhookUrl: '' } },
  { app: 'hrm', name: 'Microsoft Teams', type: 'teams', description: 'Post HR notifications to Teams', config: { webhookUrl: '' } },
  // Manufacturing
  { app: 'manufacturing', name: 'SAP Integration', type: 'custom', description: 'Sync with SAP ERP', config: { host: '', client: '', user: '' } },
  { app: 'manufacturing', name: 'IoT Gateway', type: 'webhook', description: 'Receive machine data via IoT sensors', config: { url: '', secret: '' } },
];

const DEFAULT_CONNECTIONS = [
  { name: 'Deal Won → Create Invoice', description: 'Auto-create invoice when a deal is closed won', sourceApp: 'sales-service', sourceObject: 'Opportunity', sourceEvent: 'fieldChanged', targetApp: 'accounting', targetAction: 'createInvoice', fieldMapping: [{ sourceField: 'amount', targetField: 'total' }, { sourceField: 'accountName', targetField: 'customerName' }, { sourceField: 'name', targetField: 'description' }], conditions: [{ field: 'stage', operator: 'equals', value: 'Closed Won' }] },
  { name: 'New Sales Enquiry → Marketing Enquiry', description: 'Copy new sales enquiries to Marketing for nurturing', sourceApp: 'sales-service', sourceObject: 'Lead', sourceEvent: 'created', targetApp: 'marketing', targetAction: 'createMktLead', fieldMapping: [{ sourceField: 'firstName', targetField: 'firstName' }, { sourceField: 'lastName', targetField: 'lastName' }, { sourceField: 'email', targetField: 'email' }, { sourceField: 'company', targetField: 'company' }] },
  { name: 'New Employee → CRM Person', description: 'Add new employees as people in CRM', sourceApp: 'hrm', sourceObject: 'Employee', sourceEvent: 'created', targetApp: 'sales-service', targetAction: 'createContact', fieldMapping: [{ sourceField: 'firstName', targetField: 'firstName' }, { sourceField: 'lastName', targetField: 'lastName' }, { sourceField: 'email', targetField: 'email' }] },
  { name: 'Low Stock → Sales Alert', description: 'Alert sales team when inventory is low', sourceApp: 'inventory', sourceObject: 'Item', sourceEvent: 'lowStock', targetApp: 'sales-service', targetAction: 'createActivity', fieldMapping: [{ sourceField: 'name', targetField: 'subject' }, { sourceField: 'itemCode', targetField: 'description' }] },
  { name: 'Marketing MQL → Sales Enquiry', description: 'Push qualified Marketing enquiries to the sales pipeline', sourceApp: 'marketing', sourceObject: 'MktLead', sourceEvent: 'fieldChanged', targetApp: 'sales-service', targetAction: 'createLead', fieldMapping: [{ sourceField: 'firstName', targetField: 'firstName' }, { sourceField: 'lastName', targetField: 'lastName' }, { sourceField: 'email', targetField: 'email' }, { sourceField: 'company', targetField: 'company' }], conditions: [{ field: 'stage', operator: 'equals', value: 'MQL' }] },
  { name: 'Payroll → Accounting Entry', description: 'Create salary expense in accounting when payroll is processed', sourceApp: 'hrm', sourceObject: 'PayrollRecord', sourceEvent: 'fieldChanged', targetApp: 'accounting', targetAction: 'createTransaction', fieldMapping: [{ sourceField: 'netPay', targetField: 'amount' }, { sourceField: 'employeeName', targetField: 'description' }, { sourceField: 'period', targetField: 'reference' }], conditions: [{ field: 'status', operator: 'equals', value: 'Paid' }] },
];

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const results: Record<string, number> = {};

    // Seed Sales workflows
    const existingSales = await WorkflowRule.countDocuments({ userId, isDefault: true });
    if (existingSales === 0) {
      await WorkflowRule.insertMany(SALES_DEFAULTS.map(w => ({ ...w, userId, active: true, isDefault: true })));
      results.salesWorkflows = SALES_DEFAULTS.length;
    }

    // Seed Inventory workflows
    const existingInv = await InventoryWorkflowRule.countDocuments({ userId, isDefault: true });
    if (existingInv === 0) {
      await InventoryWorkflowRule.insertMany(INVENTORY_DEFAULTS.map(w => ({ ...w, userId, active: true, isDefault: true })));
      results.inventoryWorkflows = INVENTORY_DEFAULTS.length;
    }

    // Seed Accounting workflows
    const existingAcct = await AccountingWorkflowRule.countDocuments({ userId, isDefault: true });
    if (existingAcct === 0) {
      await AccountingWorkflowRule.insertMany(ACCOUNTING_DEFAULTS.map(w => ({ ...w, userId, active: true, isDefault: true })));
      results.accountingWorkflows = ACCOUNTING_DEFAULTS.length;
    }

    // Seed Marketing automations
    const existingMkt = await MktAutomation.countDocuments({ userId, isDefault: true });
    if (existingMkt === 0) {
      await MktAutomation.insertMany(MARKETING_DEFAULTS.map(a => ({ ...a, userId, active: true, isDefault: true })));
      results.marketingAutomations = MARKETING_DEFAULTS.length;
    }

    // Seed HRM workflows
    const existingHrm = await HrmWorkflowRule.countDocuments({ userId, isDefault: true });
    if (existingHrm === 0) {
      await HrmWorkflowRule.insertMany(HRM_DEFAULTS.map(w => ({ ...w, userId, active: true, isDefault: true })));
      results.hrmWorkflows = HRM_DEFAULTS.length;
    }

    // Seed Manufacturing workflows
    const existingMfg = await MfgWorkflowRule.countDocuments({ userId, isDefault: true });
    if (existingMfg === 0) {
      await MfgWorkflowRule.insertMany(MFG_DEFAULTS.map(w => ({ ...w, userId, active: true, isDefault: true })));
      results.manufacturingWorkflows = MFG_DEFAULTS.length;
    }

    // Seed Integrations
    const existingInt = await AppIntegration.countDocuments({ userId, isDefault: true });
    if (existingInt === 0) {
      await AppIntegration.insertMany(DEFAULT_INTEGRATIONS.map(i => ({ ...i, userId, active: false, isDefault: true })));
      results.integrations = DEFAULT_INTEGRATIONS.length;
    }

    // Seed App Connections
    const existingConn = await AppConnection.countDocuments({ userId, isDefault: true });
    if (existingConn === 0) {
      await AppConnection.insertMany(DEFAULT_CONNECTIONS.map(c => ({ ...c, userId, active: true, isDefault: true })));
      results.connections = DEFAULT_CONNECTIONS.length;
    }

    return NextResponse.json({ success: true, seeded: results });
  } catch (error: any) {
    console.error('Seed defaults error:', error);
    return NextResponse.json({ error: error.message || 'Failed to seed defaults' }, { status: 500 });
  }
}
