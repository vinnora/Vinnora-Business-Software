/**
 * Built-in (standard) object registry. Server-only.
 *
 * Field metadata is derived from each Mongoose schema so the registry stays in sync
 * with the models automatically; per-object overrides fine-tune names and system fields.
 */
import type { Model, Schema } from 'mongoose';
import type { AppKey, FieldDescribe, FieldType } from './types';

// Sales & Service
import Account from '@/models/Account';
import Contact from '@/models/Contact';
import Lead from '@/models/Lead';
import Opportunity from '@/models/Opportunity';
import Case from '@/models/Case';
import Activity from '@/models/Activity';
import WorkOrder from '@/models/WorkOrder';
import KnowledgeArticle from '@/models/KnowledgeArticle';
import Technician from '@/models/Technician';
import SLA from '@/models/SLA';
// Accounting
import ChartOfAccounts from '@/models/ChartOfAccounts';
import GeneralLedger from '@/models/GeneralLedger';
import Invoice from '@/models/Invoice';
import Bill from '@/models/Bill';
import Transaction from '@/models/Transaction';
import Budget from '@/models/Budget';
import Asset from '@/models/Asset';
import Project from '@/models/Project';
import PayrollEntry from '@/models/PayrollEntry';
import TaxConfiguration from '@/models/TaxConfiguration';
// Inventory
import Item from '@/models/Item';
import InventoryItem from '@/models/InventoryItem';
import Warehouse from '@/models/Warehouse';
import Supplier from '@/models/Supplier';
import PurchaseOrder from '@/models/PurchaseOrder';
import StockTransfer from '@/models/StockTransfer';
import StockAudit from '@/models/StockAudit';
import CycleCount from '@/models/CycleCount';
import ReorderRule from '@/models/ReorderRule';
import EWayBill from '@/models/EWayBill';
import StockAdjustment from '@/models/StockAdjustment';
// Marketing
import MktCampaign from '@/models/MktCampaign';
import MktLead from '@/models/MktLead';
import MktEmailMessage from '@/models/MktEmailMessage';
import MktEmailTemplate from '@/models/MktEmailTemplate';
import MktSmsMessage from '@/models/MktSmsMessage';
import MktSocialPost from '@/models/MktSocialPost';
import MktEvent from '@/models/MktEvent';
import MktEventRegistration from '@/models/MktEventRegistration';
import MktSurvey from '@/models/MktSurvey';
import MktSurveyResponse from '@/models/MktSurveyResponse';
import MktAudienceSegment from '@/models/MktAudienceSegment';
import MktAutomation from '@/models/MktAutomation';
import MktContentAsset from '@/models/MktContentAsset';
import MktTask from '@/models/MktTask';
// HRM
import HrmEmployee from '@/models/HrmEmployee';
import HrmDepartment from '@/models/HrmDepartment';
import HrmAttendance from '@/models/HrmAttendance';
import HrmLeaveRequest from '@/models/HrmLeaveRequest';
import HrmPayroll from '@/models/HrmPayroll';
import HrmPerformanceReview from '@/models/HrmPerformanceReview';
import HrmJobPosting from '@/models/HrmJobPosting';
import HrmApplicant from '@/models/HrmApplicant';
import HrmOnboarding from '@/models/HrmOnboarding';
// Manufacturing
import MfgWorkOrder from '@/models/MfgWorkOrder';
import MfgBom from '@/models/MfgBom';
import MfgMachine from '@/models/MfgMachine';
import MfgMaterial from '@/models/MfgMaterial';
import MfgProductionLog from '@/models/MfgProductionLog';
import MfgQualityCheck from '@/models/MfgQualityCheck';
import MfgSupplier from '@/models/MfgSupplier';
import MfgPurchaseRequisition from '@/models/MfgPurchaseRequisition';
import MfgTraceabilityLog from '@/models/MfgTraceabilityLog';

export interface StandardObject {
  apiName: string;
  label: string;
  pluralLabel: string;
  app: AppKey;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  description?: string;
  nameFields?: string[];
  /** Record APIs enforce permissions/FLS/validation/restriction rules (pilot rollout). */
  enforced?: boolean;
  /** Extra fields maintained by the app's own logic (shown read-only). */
  systemFields?: string[];
  /** System fields the app's own pages may still send (denormalised display names). */
  appWritable?: string[];
  /** Fields not exposed in Setup at all. */
  hiddenFields?: string[];
  fieldOverrides?: Record<string, Partial<FieldDescribe>>;
}

const so = (
  app: AppKey,
  apiName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  label: string,
  pluralLabel: string,
  extra: Partial<StandardObject> = {},
): StandardObject => ({ app, apiName, model, label, pluralLabel, ...extra });

export const STANDARD_OBJECTS: StandardObject[] = [
  // Sales & Service — pilot: enforced
  so('sales-service', 'Account', Account, 'Company', 'Companies', {
    enforced: true,
    description: 'Companies you do business with.',
    fieldOverrides: { website: { type: 'url' } },
  }),
  so('sales-service', 'Contact', Contact, 'Person', 'People', {
    enforced: true,
    description: 'People associated with companies.',
    systemFields: ['accountName'],
    appWritable: ['accountName'],
  }),
  so('sales-service', 'Lead', Lead, 'Enquiry', 'Enquiries', {
    enforced: true,
    description: 'Prospects not yet qualified.',
    systemFields: ['convertedAt', 'convertedAccountId', 'convertedContactId', 'convertedOpportunityId'],
  }),
  so('sales-service', 'Opportunity', Opportunity, 'Deal', 'Deals', {
    enforced: true,
    description: 'Deals in progress.',
    systemFields: ['probability', 'accountName', 'contactName'],
    appWritable: ['accountName', 'contactName'],
    fieldOverrides: { currency: { type: 'text' } },
  }),
  so('sales-service', 'Case', Case, 'Ticket', 'Tickets', {
    enforced: true,
    description: 'Customer issues and support requests.',
    nameFields: ['caseNumber', 'subject'],
    systemFields: ['caseNumber', 'slaId', 'slaDueAt', 'firstResponseAt', 'resolvedAt', 'closedAt', 'accountName', 'contactName'],
    appWritable: ['accountName', 'contactName', 'firstResponseAt'],
  }),
  so('sales-service', 'Activity', Activity, 'Follow-up', 'Follow-ups', { nameFields: ['subject'] }),
  so('sales-service', 'WorkOrder', WorkOrder, 'Job Card', 'Job Cards', { nameFields: ['workOrderNumber', 'subject'] }),
  so('sales-service', 'KnowledgeArticle', KnowledgeArticle, 'Help Article', 'Help Articles', { nameFields: ['title'] }),
  so('sales-service', 'Technician', Technician, 'Technician', 'Technicians'),
  so('sales-service', 'SLA', SLA, 'SLA', 'SLAs'),

  // Accounting
  so('accounting', 'ChartOfAccounts', ChartOfAccounts, 'GL Account', 'Chart of Accounts'),
  so('accounting', 'GeneralLedger', GeneralLedger, 'Ledger Entry', 'General Ledger'),
  so('accounting', 'Invoice', Invoice, 'Invoice', 'Invoices'),
  so('accounting', 'Bill', Bill, 'Bill', 'Bills'),
  so('accounting', 'Transaction', Transaction, 'Transaction', 'Transactions'),
  so('accounting', 'Budget', Budget, 'Budget', 'Budgets'),
  so('accounting', 'Asset', Asset, 'Fixed Asset', 'Fixed Assets'),
  so('accounting', 'Project', Project, 'Project', 'Projects'),
  so('accounting', 'PayrollEntry', PayrollEntry, 'Payroll Entry', 'Payroll Entries'),
  so('accounting', 'TaxConfiguration', TaxConfiguration, 'Tax Rate', 'Tax Rates'),

  // Inventory
  so('inventory', 'Item', Item, 'Item', 'Items'),
  so('inventory', 'InventoryItem', InventoryItem, 'Stock Item', 'Stock Items'),
  so('inventory', 'Warehouse', Warehouse, 'Warehouse', 'Warehouses'),
  so('inventory', 'Supplier', Supplier, 'Supplier', 'Suppliers'),
  so('inventory', 'PurchaseOrder', PurchaseOrder, 'Purchase Order', 'Purchase Orders'),
  so('inventory', 'StockTransfer', StockTransfer, 'Stock Transfer', 'Stock Transfers'),
  so('inventory', 'StockAudit', StockAudit, 'Stock Audit', 'Stock Audits'),
  so('inventory', 'CycleCount', CycleCount, 'Cycle Count', 'Cycle Counts'),
  so('inventory', 'ReorderRule', ReorderRule, 'Reorder Rule', 'Reorder Rules'),
  so('inventory', 'EWayBill', EWayBill, 'E-Way Bill', 'E-Way Bills'),
  so('inventory', 'StockAdjustment', StockAdjustment, 'Stock Adjustment', 'Stock Adjustments'),

  // Marketing
  so('marketing', 'MktCampaign', MktCampaign, 'Promotion', 'Promotions'),
  so('marketing', 'MktLead', MktLead, 'Marketing Enquiry', 'Marketing Enquiries'),
  so('marketing', 'MktEmailMessage', MktEmailMessage, 'Email', 'Emails'),
  so('marketing', 'MktEmailTemplate', MktEmailTemplate, 'Email Template', 'Email Templates'),
  so('marketing', 'MktSmsMessage', MktSmsMessage, 'SMS Message', 'SMS Messages'),
  so('marketing', 'MktSocialPost', MktSocialPost, 'Social Post', 'Social Posts', {
    // social-media account, not a CRM company
    fieldOverrides: { accountName: { label: 'Account Name' } },
  }),
  so('marketing', 'MktEvent', MktEvent, 'Event', 'Events'),
  so('marketing', 'MktEventRegistration', MktEventRegistration, 'Event Registration', 'Event Registrations'),
  so('marketing', 'MktSurvey', MktSurvey, 'Survey', 'Surveys'),
  so('marketing', 'MktSurveyResponse', MktSurveyResponse, 'Survey Response', 'Survey Responses'),
  so('marketing', 'MktAudienceSegment', MktAudienceSegment, 'Segment', 'Segments'),
  so('marketing', 'MktAutomation', MktAutomation, 'Automation', 'Automations'),
  so('marketing', 'MktContentAsset', MktContentAsset, 'Content Asset', 'Content Assets'),
  so('marketing', 'MktTask', MktTask, 'Marketing Task', 'Marketing Tasks'),

  // HRM
  so('hrm', 'HrmEmployee', HrmEmployee, 'Employee', 'Employees'),
  so('hrm', 'HrmDepartment', HrmDepartment, 'Department', 'Departments'),
  so('hrm', 'HrmAttendance', HrmAttendance, 'Attendance Record', 'Attendance'),
  so('hrm', 'HrmLeaveRequest', HrmLeaveRequest, 'Leave Request', 'Leave Requests'),
  so('hrm', 'HrmPayroll', HrmPayroll, 'Payslip', 'Payslips'),
  so('hrm', 'HrmPerformanceReview', HrmPerformanceReview, 'Performance Review', 'Performance Reviews'),
  so('hrm', 'HrmJobPosting', HrmJobPosting, 'Job Posting', 'Job Postings'),
  so('hrm', 'HrmApplicant', HrmApplicant, 'Applicant', 'Applicants'),
  so('hrm', 'HrmOnboarding', HrmOnboarding, 'Onboarding', 'Onboardings'),

  // Manufacturing
  so('manufacturing', 'MfgWorkOrder', MfgWorkOrder, 'Production Order', 'Production Orders'),
  so('manufacturing', 'MfgBom', MfgBom, 'Bill of Materials', 'Bills of Materials'),
  so('manufacturing', 'MfgMachine', MfgMachine, 'Machine', 'Machines'),
  so('manufacturing', 'MfgMaterial', MfgMaterial, 'Material', 'Materials'),
  so('manufacturing', 'MfgProductionLog', MfgProductionLog, 'Production Log', 'Production Logs'),
  so('manufacturing', 'MfgQualityCheck', MfgQualityCheck, 'Quality Check', 'Quality Checks'),
  so('manufacturing', 'MfgSupplier', MfgSupplier, 'Supplier', 'Suppliers'),
  so('manufacturing', 'MfgPurchaseRequisition', MfgPurchaseRequisition, 'Purchase Requisition', 'Purchase Requisitions'),
  so('manufacturing', 'MfgTraceabilityLog', MfgTraceabilityLog, 'Traceability Log', 'Traceability Logs'),
];

const BY_API = new Map(STANDARD_OBJECTS.map((o) => [o.apiName.toLowerCase(), o]));

export function getStandardObject(apiName: string): StandardObject | undefined {
  return BY_API.get(apiName.toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Schema → field metadata                                             */
/* ------------------------------------------------------------------ */

const ALWAYS_HIDDEN = new Set(['_id', '__v', 'orgId', 'custom']);
const ALWAYS_SYSTEM = new Set(['userId', 'createdAt', 'updatedAt', 'createdById', 'lastModifiedById']);
const APP_PREFIX: Record<AppKey, string> = {
  'sales-service': '',
  accounting: '',
  inventory: '',
  marketing: 'Mkt',
  hrm: 'Hrm',
  manufacturing: 'Mfg',
};

export function humanize(path: string): string {
  const special: Record<string, string> = {
    userId: 'Created By (Email)',
    createdAt: 'Created Date',
    updatedAt: 'Last Modified Date',
    ownerId: 'Owner ID',
    ownerName: 'Owner',
  };
  if (special[path]) return special[path];
  const last = path.split('.').map((p) =>
    p
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase()),
  );
  return last.join(' ').replace(/\bId\b/g, 'ID').replace(/\bSla\b/g, 'SLA').replace(/\bUrl\b/g, 'URL');
}

/** Vinnora record names used in built-in field labels of CRM (Sell & Support, Marketing) objects. */
const CRM_RECORD_TERMS: [RegExp, string][] = [
  [/\bWork Orders\b/g, 'Job Cards'],
  [/\bWork Order\b/g, 'Job Card'],
  [/\bAccounts\b/g, 'Companies'],
  [/\bAccount\b/g, 'Company'],
  [/\bContacts\b/g, 'People'],
  [/\bContact\b/g, 'Person'],
  [/\bLeads\b/g, 'Enquiries'],
  [/\bLead\b/g, 'Enquiry'],
  [/\bOpportunities\b/g, 'Deals'],
  [/\bOpportunity\b/g, 'Deal'],
  [/\bCases\b/g, 'Tickets'],
  [/\bCase\b/g, 'Ticket'],
  [/\bCampaigns\b/g, 'Promotions'],
  [/\bCampaign\b/g, 'Promotion'],
];

/** Default label of a built-in field: humanized path, with record terms renamed on CRM objects. */
function fieldLabel(path: string, app: AppKey): string {
  const label = humanize(path);
  if (app !== 'sales-service' && app !== 'marketing') return label;
  return CRM_RECORD_TERMS.reduce((l, [re, to]) => l.replace(re, to), label);
}

function guessReference(path: string, app: AppKey): string | undefined {
  const m = /^([a-z][A-Za-z]*)Id$/.exec(path);
  if (!m || path === 'ownerId' || path === 'userId') return undefined;
  const base = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const candidates = [APP_PREFIX[app] + base, base];
  for (const c of candidates) {
    const obj = BY_API.get(c.toLowerCase());
    if (obj && obj.app === app) return obj.apiName;
  }
  for (const c of candidates) {
    const obj = BY_API.get(c.toLowerCase());
    if (obj) return obj.apiName;
  }
  return undefined;
}

function guessType(path: string, instance: string, app: AppKey, hasEnum: boolean): { type: FieldType; referenceTo?: string } | null {
  const leaf = path.split('.').pop() || path;
  switch (instance) {
    case 'String': {
      if (hasEnum) return { type: 'picklist' };
      const ref = guessReference(leaf, app);
      if (ref) return { type: 'lookup', referenceTo: ref };
      if (/email/i.test(leaf)) return { type: 'email' };
      if (/phone|mobile/i.test(leaf)) return { type: 'phone' };
      if (/website|url$/i.test(leaf)) return { type: 'url' };
      if (/description|notes?$|body|content|comments?$|summary|address$/i.test(leaf)) return { type: 'textarea' };
      return { type: 'text' };
    }
    case 'Number':
      if (/probability|percent|discount|rate$/i.test(leaf) && !/hourly|exchange/i.test(leaf)) return { type: 'percent' };
      if (/amount|revenue|price|cost|salary|total|balance|budget|value$|pay$|tax$|wage|fee/i.test(leaf)) return { type: 'currency' };
      return { type: 'number' };
    case 'Date':
      return { type: /At$|Time$/.test(leaf) ? 'datetime' : 'date' };
    case 'Boolean':
      return { type: 'checkbox' };
    case 'Array':
      return hasEnum ? { type: 'multipicklist' } : null;
    default:
      return null;
  }
}

const describeCache = new Map<string, FieldDescribe[]>();

/** Built-in fields of a standard object, derived from its Mongoose schema (cached). */
export function standardFields(obj: StandardObject): FieldDescribe[] {
  const cached = describeCache.get(obj.apiName);
  if (cached) return cached;

  const schema = obj.model.schema as Schema;
  const hidden = new Set([...(obj.hiddenFields || [])]);
  const system = new Set([...(obj.systemFields || [])]);
  const fields: FieldDescribe[] = [];

  schema.eachPath((path, schemaType) => {
    if (ALWAYS_HIDDEN.has(path) || hidden.has(path)) return;
    if (path.includes('.$')) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = schemaType as any;
    const instance: string = st.instance;
    // arrays of sub-documents (line items, comments...) aren't simple fields
    if (instance === 'Array' && st.schema) return;
    const inner = st.embeddedSchemaType || st.$embeddedSchemaType || st.caster;
    const enumValues: string[] =
      (st.enumValues && st.enumValues.length ? st.enumValues : inner?.enumValues) || [];
    const guessed = guessType(path, instance, obj.app, enumValues.length > 0);
    if (!guessed) return;

    const isSystem = ALWAYS_SYSTEM.has(path) || system.has(path);
    const required = !isSystem && Boolean(st.isRequired);
    const def = typeof st.defaultValue === 'function' ? undefined : st.defaultValue;
    const apiName = path.replace(/\./g, '_');

    const f: FieldDescribe = {
      apiName,
      path,
      label: fieldLabel(path, obj.app),
      type: guessed.type,
      referenceTo: guessed.referenceTo,
      isCustom: false,
      isSystem,
      appWritable: obj.appWritable?.includes(path) || undefined,
      required,
      requiredLocked: required,
      picklistValues: enumValues.length ? enumValues.map((v) => ({ value: v, label: v, active: true })) : undefined,
      restrictedPicklist: enumValues.length ? true : undefined,
      defaultValue: def,
    };
    const override = obj.fieldOverrides?.[apiName];
    fields.push(override ? { ...f, ...override } : f);
  });

  // Make the timestamps always present and last
  const order = (f: FieldDescribe) => (f.isSystem ? 1 : 0);
  fields.sort((a, b) => order(a) - order(b));

  describeCache.set(obj.apiName, fields);
  return fields;
}

/** Fields making up the display name of a standard object. */
export function standardNameFields(obj: StandardObject): string[] {
  if (obj.nameFields) return obj.nameFields;
  const schema = obj.model.schema as Schema;
  if (schema.path('name')) return ['name'];
  if (schema.path('firstName') && schema.path('lastName')) return ['firstName', 'lastName'];
  for (const p of ['title', 'subject', 'fullName', 'employeeName', 'itemName', 'number']) {
    if (schema.path(p)) return [p];
  }
  const firstRequired = standardFields(obj).find((f) => f.required && f.type === 'text');
  return firstRequired ? [firstRequired.apiName] : ['_id'];
}

export function supportsCustomFields(obj: StandardObject): boolean {
  return Boolean((obj.model.schema as Schema).path('custom'));
}
