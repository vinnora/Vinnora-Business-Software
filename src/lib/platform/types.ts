/**
 * Platform metadata types — shared by server (enforcement) and client (Setup UI, dynamic forms).
 * Keep this file free of server-only imports.
 */

export type AppKey = 'sales-service' | 'accounting' | 'inventory' | 'marketing' | 'hrm' | 'manufacturing';

export const APP_LABELS: Record<AppKey, string> = {
  'sales-service': 'Sales & Service',
  accounting: 'Accounting',
  inventory: 'Inventory',
  marketing: 'Marketing',
  hrm: 'HRM',
  manufacturing: 'Manufacturing',
};

export const ALL_APP_KEYS = Object.keys(APP_LABELS) as AppKey[];

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'picklist'
  | 'multipicklist'
  | 'email'
  | 'phone'
  | 'url'
  | 'lookup'
  | 'formula';

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Text Area',
  number: 'Number',
  currency: 'Currency',
  percent: 'Percent',
  date: 'Date',
  datetime: 'Date/Time',
  checkbox: 'Checkbox',
  picklist: 'Picklist',
  multipicklist: 'Picklist (Multi-Select)',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  lookup: 'Lookup Relationship',
  formula: 'Formula',
};

export type FormulaReturnType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'checkbox';

export interface PicklistOption {
  value: string;
  label?: string;
  active?: boolean;
  isDefault?: boolean;
  color?: string;
}

export interface FieldDescribe {
  apiName: string;
  label: string;
  type: FieldType;
  isCustom: boolean;
  /** Field is maintained by the system (ids, timestamps, audit) and never editable. */
  isSystem: boolean;
  /** System field the app's own pages may set (denormalised names like accountName). */
  appWritable?: boolean;
  /** Required at the data level — enforced on every save. */
  required: boolean;
  /** Built-in fields that are required by the underlying model can't be made optional. */
  requiredLocked?: boolean;
  unique?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  picklistValues?: PicklistOption[];
  /** Picklist values may only come from the list (true for built-in enum fields). */
  restrictedPicklist?: boolean;
  referenceTo?: string;
  formula?: string;
  returnType?: FormulaReturnType;
  defaultValue?: unknown;
  helpText?: string;
  description?: string;
  active?: boolean;
  /** Storage path in Mongo (custom fields on built-in objects live under `custom.`). */
  path: string;
  /** DB id for custom fields / overrides. */
  id?: string;
}

/* ------------------------------------------------------------------ */
/* Objects                                                             */
/* ------------------------------------------------------------------ */

export interface ObjectDescribe {
  apiName: string;
  label: string;
  pluralLabel: string;
  app: AppKey;
  isCustom: boolean;
  description?: string;
  /** Field(s) that make up the record's display name. */
  nameFields: string[];
  /** True when record APIs for this object enforce permissions, FLS, validation and restriction rules. */
  enforced: boolean;
  /** Custom fields can be stored on this object's records. */
  supportsCustomFields: boolean;
  fields: FieldDescribe[];
  id?: string;
}

export interface ObjectSummary {
  apiName: string;
  label: string;
  pluralLabel: string;
  app: AppKey;
  isCustom: boolean;
  enforced: boolean;
  description?: string;
  customFieldCount?: number;
}

/* ------------------------------------------------------------------ */
/* Conditions (validation builder + restriction rules)                 */
/* ------------------------------------------------------------------ */

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'greaterThan'
  | 'greaterOrEqual'
  | 'lessThan'
  | 'lessOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'in'
  | 'notIn';

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'equals',
  notEquals: 'not equal to',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  greaterThan: 'greater than',
  greaterOrEqual: 'greater or equal',
  lessThan: 'less than',
  lessOrEqual: 'less or equal',
  isEmpty: 'is blank',
  isNotEmpty: 'is not blank',
  in: 'is one of',
  notIn: 'is not one of',
};

export const VALUELESS_OPERATORS: ConditionOperator[] = ['isEmpty', 'isNotEmpty'];

export interface Condition {
  field: string;
  operator: ConditionOperator;
  /** Literal value, comma list for in/notIn, or a $User token (e.g. $User.Id). */
  value?: string;
}

/** Tokens usable as condition values / in formulas. */
export const USER_TOKENS = [
  { token: '$User.Id', label: 'Current user ID' },
  { token: '$User.Email', label: 'Current user email' },
  { token: '$User.Name', label: 'Current user name' },
  { token: '$User.ProfileId', label: 'Current user profile ID' },
  { token: '$User.Role', label: 'Current user org role' },
];

/* ------------------------------------------------------------------ */
/* Validation & restriction rules                                      */
/* ------------------------------------------------------------------ */

export interface ValidationRuleDTO {
  _id?: string;
  objectApiName: string;
  name: string;
  description?: string;
  active: boolean;
  mode: 'builder' | 'formula';
  conditions: Condition[];
  /** e.g. "1 AND (2 OR 3)"; blank = all conditions ANDed. */
  logic?: string;
  formula?: string;
  errorMessage: string;
  /** Show the error next to this field; blank = top of page. */
  errorField?: string;
}

export type RestrictionAppliesTo = 'all' | 'profiles' | 'permissionSets' | 'users';

export interface RestrictionRuleDTO {
  _id?: string;
  objectApiName: string;
  name: string;
  description?: string;
  active: boolean;
  appliesTo: RestrictionAppliesTo;
  appliesToIds: string[];
  conditions: Condition[];
  logic?: string;
}

/* ------------------------------------------------------------------ */
/* Page layouts                                                        */
/* ------------------------------------------------------------------ */

export type LayoutBehavior = 'edit' | 'required' | 'readonly';

export interface LayoutItem {
  field: string;
  behavior: LayoutBehavior;
}

export interface LayoutSection {
  id: string;
  label: string;
  columns: 1 | 2;
  /** Hide the section on create forms (e.g. "System Information"). */
  hideOnCreate?: boolean;
  items: LayoutItem[];
}

export interface PageLayoutDTO {
  _id?: string;
  objectApiName: string;
  name: string;
  description?: string;
  isDefault: boolean;
  sections: LayoutSection[];
  /** Generated on the fly when no saved layout exists. */
  generated?: boolean;
}

/* ------------------------------------------------------------------ */
/* Profiles & permission sets                                          */
/* ------------------------------------------------------------------ */

export interface ObjectPermission {
  create: boolean;
  read: boolean;
  edit: boolean;
  delete: boolean;
  viewAll: boolean;
  modifyAll: boolean;
}

export interface FieldPermission {
  read: boolean;
  edit: boolean;
}

export const OBJECT_PERMISSION_KEYS: (keyof ObjectPermission)[] = [
  'read',
  'create',
  'edit',
  'delete',
  'viewAll',
  'modifyAll',
];

export const OBJECT_PERMISSION_LABELS: Record<keyof ObjectPermission, string> = {
  read: 'Read',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  viewAll: 'View All',
  modifyAll: 'Modify All',
};

export type SystemPermissionKey =
  | 'viewSetup'
  | 'customizeApplication'
  | 'manageProfilesPermissionSets'
  | 'manageUsers'
  | 'viewAllData'
  | 'modifyAllData'
  | 'exportData'
  | 'importData'
  | 'manageReports'
  | 'manageSandboxes'
  | 'manageBilling';

export const SYSTEM_PERMISSIONS: { key: SystemPermissionKey; label: string; description: string }[] = [
  { key: 'viewSetup', label: 'View Setup and Configuration', description: 'Open Setup pages and see configuration (read-only).' },
  { key: 'customizeApplication', label: 'Customize Application', description: 'Create and edit objects, fields, validation rules, restriction rules and page layouts.' },
  { key: 'manageProfilesPermissionSets', label: 'Manage Profiles and Permission Sets', description: 'Create, edit and delete profiles, permission sets and groups.' },
  { key: 'manageUsers', label: 'Manage Users', description: 'Assign profiles and permission sets to users.' },
  { key: 'viewAllData', label: 'View All Data', description: 'See every record in every object, ignoring restriction rules.' },
  { key: 'modifyAllData', label: 'Modify All Data', description: 'Create, edit and delete every record in every object.' },
  { key: 'exportData', label: 'Export Data', description: 'Export records with the Data Loader and export report results.' },
  { key: 'importData', label: 'Import Data', description: 'Insert, update, upsert and delete records in bulk with the Data Loader.' },
  { key: 'manageReports', label: 'Manage Public Reports & Dashboards', description: 'Create, edit and delete reports and dashboards shared with everyone.' },
  { key: 'manageSandboxes', label: 'Manage Sandboxes & Deployments', description: 'Create, refresh and delete sandboxes, and deploy changes to production.' },
  { key: 'manageBilling', label: 'Manage Billing', description: 'Change the subscription plan and billing details.' },
];

export type SystemPermissions = Partial<Record<SystemPermissionKey, boolean>>;

export interface PermissionBundle {
  appAccess: AppKey[];
  objectPermissions: Record<string, Partial<ObjectPermission>>;
  fieldPermissions: Record<string, Record<string, Partial<FieldPermission>>>;
  systemPermissions: SystemPermissions;
}

export interface ProfileDTO extends PermissionBundle {
  _id?: string;
  name: string;
  description?: string;
  /** Built-in profiles: system_admin, standard_user, read_only. */
  key?: string;
  isSystem: boolean;
  /** Applied to objects without an explicit entry (e.g. newly created custom objects). */
  defaultObjectAccess: ObjectPermission;
  userCount?: number;
}

export interface PermissionSetDTO extends PermissionBundle {
  _id?: string;
  name: string;
  apiName: string;
  description?: string;
  userCount?: number;
}

export interface PermissionSetGroupDTO {
  _id?: string;
  name: string;
  apiName: string;
  description?: string;
  permissionSetIds: string[];
  userCount?: number;
}

/** What the current user is allowed to do with one object (returned by describe). */
export interface UserObjectAccess extends ObjectPermission {
  fields: Record<string, FieldPermission>;
}

export interface DescribeResponse {
  object: ObjectDescribe;
  access: UserObjectAccess;
  layout: PageLayoutDTO;
}

export interface FieldError {
  field?: string;
  message: string;
}

export const EMPTY_OBJECT_PERMISSION: ObjectPermission = {
  create: false,
  read: false,
  edit: false,
  delete: false,
  viewAll: false,
  modifyAll: false,
};

export const FULL_OBJECT_PERMISSION: ObjectPermission = {
  create: true,
  read: true,
  edit: true,
  delete: true,
  viewAll: true,
  modifyAll: true,
};

/** Normalise an object permission so dependent permissions stay consistent (Salesforce rules). */
export function normalizeObjectPermission(p: Partial<ObjectPermission>): ObjectPermission {
  const out: ObjectPermission = { ...EMPTY_OBJECT_PERMISSION, ...p };
  if (out.modifyAll) {
    out.viewAll = true;
    out.delete = true;
    out.edit = true;
  }
  if (out.viewAll) out.read = true;
  if (out.delete) out.edit = true;
  if (out.edit || out.create) out.read = true;
  return out;
}

export function toApiName(label: string): string {
  const base = label
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'X$1');
  return base || 'Field';
}
