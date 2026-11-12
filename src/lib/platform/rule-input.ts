/** Validation of validation-rule / restriction-rule payloads. Server-only. */
import mongoose from 'mongoose';
import { checkFormula } from './formula';
import { validateLogic } from './conditions';
import { BadRequestError } from './errors';
import {
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  type Condition,
  type ConditionOperator,
  type ObjectDescribe,
  type RestrictionAppliesTo,
} from './types';

export function cleanConditions(raw: unknown, object: ObjectDescribe, opts: { allowFormula?: boolean } = {}): Condition[] {
  if (!Array.isArray(raw)) return [];
  const byName = new Map(object.fields.map((f) => [f.apiName, f]));
  return raw.map((c, i) => {
    const field = String(c?.field ?? '');
    const operator = String(c?.operator ?? '') as ConditionOperator;
    const def = byName.get(field);
    if (!def) throw new BadRequestError(`Condition ${i + 1}: choose a field`);
    if (def.type === 'formula' && opts.allowFormula === false) {
      throw new BadRequestError(`Condition ${i + 1}: formula fields can't be used in restriction rules`);
    }
    if (!OPERATOR_LABELS[operator]) throw new BadRequestError(`Condition ${i + 1}: choose an operator`);
    const value = VALUELESS_OPERATORS.includes(operator) ? '' : String(c?.value ?? '').slice(0, 1000);
    return { field, operator, value };
  });
}

export function cleanValidationRule(body: Record<string, unknown>, object: ObjectDescribe) {
  const name = String(body.name ?? '').trim().slice(0, 80);
  if (!name) throw new BadRequestError('Rule name is required');
  const errorMessage = String(body.errorMessage ?? '').trim().slice(0, 500);
  if (!errorMessage) throw new BadRequestError('Error message is required');
  const mode = body.mode === 'formula' ? 'formula' : 'builder';
  const errorField = String(body.errorField ?? '');
  if (errorField && !object.fields.some((f) => f.apiName === errorField)) throw new BadRequestError('Error location field not found');

  const out: Record<string, unknown> = {
    name,
    description: String(body.description ?? '').slice(0, 1000),
    active: body.active !== false,
    mode,
    errorMessage,
    errorField: errorField || undefined,
    conditions: [],
    logic: '',
    formula: '',
  };
  if (mode === 'formula') {
    const formula = String(body.formula ?? '').trim();
    const check = checkFormula(formula, object.fields.map((f) => f.apiName));
    if (!check.ok) throw new BadRequestError(`Formula error: ${check.error}`);
    out.formula = formula;
  } else {
    const conditions = cleanConditions(body.conditions, object);
    if (!conditions.length) throw new BadRequestError('Add at least one condition');
    const logic = String(body.logic ?? '').trim().slice(0, 500);
    const err = validateLogic(logic, conditions.length);
    if (err) throw new BadRequestError(err);
    out.conditions = conditions;
    out.logic = logic;
  }
  return out;
}

export function cleanRestrictionRule(body: Record<string, unknown>, object: ObjectDescribe) {
  const name = String(body.name ?? '').trim().slice(0, 80);
  if (!name) throw new BadRequestError('Rule name is required');
  const appliesTo = (['all', 'profiles', 'permissionSets', 'users'].includes(String(body.appliesTo))
    ? body.appliesTo
    : 'all') as RestrictionAppliesTo;
  const appliesToIds = appliesTo === 'all'
    ? []
    : (Array.isArray(body.appliesToIds) ? (body.appliesToIds as unknown[]) : []).map(String).filter((id) => mongoose.isValidObjectId(id));
  if (appliesTo !== 'all' && !appliesToIds.length) throw new BadRequestError('Choose who this rule applies to');
  const conditions = cleanConditions(body.conditions, object, { allowFormula: false });
  if (!conditions.length) throw new BadRequestError('Add at least one record criterion');
  const logic = String(body.logic ?? '').trim().slice(0, 500);
  const err = validateLogic(logic, conditions.length);
  if (err) throw new BadRequestError(err);
  return {
    name,
    description: String(body.description ?? '').slice(0, 1000),
    active: body.active !== false,
    appliesTo,
    appliesToIds,
    conditions,
    logic,
  };
}
