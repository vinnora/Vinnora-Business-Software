/** Validation of field-definition payloads from Setup. Server-only. */
import { checkFormula } from './formula';
import { BadRequestError } from './errors';
import { FIELD_TYPE_LABELS, type FieldType, type ObjectDescribe, type PicklistOption } from './types';

const RETURN_TYPES = ['text', 'number', 'currency', 'percent', 'date', 'checkbox'];

export function cleanPicklist(values: unknown): PicklistOption[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: PicklistOption[] = [];
  let defaultSeen = false;
  for (const raw of values) {
    const v = typeof raw === 'string' ? { value: raw } : (raw as PicklistOption);
    const value = String(v?.value ?? '').trim().slice(0, 255);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const isDefault = Boolean(v.isDefault) && !defaultSeen;
    if (isDefault) defaultSeen = true;
    out.push({
      value,
      label: String(v.label ?? value).trim().slice(0, 255) || value,
      active: v.active !== false,
      isDefault,
      color: typeof v.color === 'string' ? v.color.slice(0, 20) : undefined,
    });
  }
  return out;
}

export interface FieldInput {
  label: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  picklistValues?: PicklistOption[];
  restrictedPicklist?: boolean;
  referenceTo?: string;
  formula?: string;
  returnType?: string;
  defaultValue?: unknown;
  helpText?: string;
  description?: string;
}

/** Validate a custom field definition (create or update). */
export function validateCustomField(
  body: Record<string, unknown>,
  object: ObjectDescribe,
  knownObjects: string[],
  existingType?: FieldType,
): FieldInput {
  const label = String(body.label ?? '').trim().slice(0, 80);
  if (!label) throw new BadRequestError('Field label is required');
  const type = (existingType || body.type) as FieldType;
  if (!FIELD_TYPE_LABELS[type]) throw new BadRequestError('Choose a valid field type');

  const out: FieldInput = {
    label,
    type,
    required: Boolean(body.required) && type !== 'formula' && type !== 'checkbox',
    unique: Boolean(body.unique) && ['text', 'email', 'phone', 'number'].includes(type),
    helpText: String(body.helpText ?? '').slice(0, 500),
    description: String(body.description ?? '').slice(0, 1000),
  };

  if (['text', 'textarea', 'email', 'phone', 'url'].includes(type)) {
    const max = type === 'textarea' ? 32000 : 255;
    const len = Number(body.length || (type === 'textarea' ? 32000 : 255));
    out.length = Math.min(Math.max(1, Number.isFinite(len) ? len : max), max);
  }
  if (['number', 'currency', 'percent'].includes(type)) {
    const scale = Number(body.scale ?? (type === 'number' ? 0 : 2));
    out.scale = Math.min(Math.max(0, Number.isFinite(scale) ? scale : 0), 8);
    out.precision = 18;
  }
  if (type === 'picklist' || type === 'multipicklist') {
    out.picklistValues = cleanPicklist(body.picklistValues);
    if (!out.picklistValues.length) throw new BadRequestError('Add at least one dropdown value');
    out.restrictedPicklist = body.restrictedPicklist !== false;
  }
  if (type === 'lookup') {
    const ref = String(body.referenceTo ?? '');
    if (!knownObjects.includes(ref)) throw new BadRequestError('Choose the module this link points to');
    out.referenceTo = ref;
  }
  if (type === 'formula') {
    const formula = String(body.formula ?? '').trim();
    const rt = String(body.returnType ?? 'text');
    if (!RETURN_TYPES.includes(rt)) throw new BadRequestError('Choose a calculated field return type');
    const check = checkFormula(formula, object.fields.map((f) => f.apiName));
    if (!check.ok) throw new BadRequestError(`Formula error: ${check.error}`);
    out.formula = formula;
    out.returnType = rt;
  }
  if (type !== 'formula' && body.defaultValue !== undefined && body.defaultValue !== '') {
    out.defaultValue = type === 'checkbox' ? Boolean(body.defaultValue) : body.defaultValue;
  }
  if (type === 'checkbox' && out.defaultValue === undefined) out.defaultValue = false;
  return out;
}
