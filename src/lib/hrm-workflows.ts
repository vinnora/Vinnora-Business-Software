import HrmWorkflowRule from '@/models/HrmWorkflowRule';
import type { HrmWorkflowObject, HrmWorkflowEvent } from '@/models/HrmWorkflowRule';

function getField(obj: any, path: string): any {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function evalCondition(record: any, c: any): boolean {
  const v = getField(record, c.field);
  switch (c.operator) {
    case 'equals': return String(v) === String(c.value);
    case 'notEquals': return String(v) !== String(c.value);
    case 'contains': return String(v ?? '').toLowerCase().includes(String(c.value ?? '').toLowerCase());
    case 'greaterThan': return Number(v) > Number(c.value);
    case 'lessThan': return Number(v) < Number(c.value);
    case 'isEmpty': return v == null || v === '' || (Array.isArray(v) && v.length === 0);
    case 'isNotEmpty': return !(v == null || v === '' || (Array.isArray(v) && v.length === 0));
    default: return false;
  }
}

function evalConditions(record: any, conditions: any[], logic: 'AND' | 'OR'): boolean {
  if (!conditions || conditions.length === 0) return true;
  if (logic === 'OR') return conditions.some((c) => evalCondition(record, c));
  return conditions.every((c) => evalCondition(record, c));
}

function interpolate(template: string, record: any): string {
  return String(template ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const v = getField(record, key);
    return v == null ? '' : String(v);
  });
}

async function executeAction(action: any, record: any, objectType: string, userId: string) {
  const params = action.params || {};
  switch (action.type) {
    case 'updateField': {
      if (!params.field) break;
      record[params.field] = interpolate(String(params.value ?? ''), record) || params.value;
      await record.save();
      break;
    }
    case 'sendEmail': {
      console.log(`[HRM Workflow] sendEmail to=${record.email || 'N/A'} subject="${interpolate(params.subject || '', record)}"`);
      break;
    }
    case 'createActivity': {
      console.log(`[HRM Workflow] createActivity: ${interpolate(params.subject || `HR action on ${objectType}`, record)}`);
      break;
    }
    case 'createOnboarding': {
      console.log(`[HRM Workflow] createOnboarding for employee ${record.employeeId || record._id}`);
      break;
    }
    case 'notify': {
      console.log(`[HRM Workflow] notify: ${interpolate(params.message || '', record)}`);
      break;
    }
    case 'webhook': {
      if (!params.url) break;
      try {
        await fetch(params.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectType, record }),
        });
      } catch { /* swallow */ }
      break;
    }
  }
}

export async function runHrmWorkflows(opts: {
  objectType: HrmWorkflowObject;
  event: HrmWorkflowEvent;
  record: any;
  userId: string;
  changedFields?: string[];
}) {
  try {
    const { objectType, event, record, userId, changedFields } = opts;
    const filter: any = { userId, objectType, active: true };
    if (event === 'fieldChanged') {
      filter.triggerEvent = { $in: ['fieldChanged', 'updated'] };
    } else {
      filter.triggerEvent = event;
    }

    const rules = await HrmWorkflowRule.find(filter);
    for (const rule of rules) {
      if (rule.triggerEvent === 'fieldChanged') {
        if (!rule.watchFields || rule.watchFields.length === 0) continue;
        if (!changedFields || !changedFields.some((f) => rule.watchFields!.includes(f))) continue;
      }
      if (!evalConditions(record, rule.conditions, rule.conditionLogic)) continue;

      for (const action of rule.actions) {
        await executeAction(action, record, objectType, userId);
      }
      rule.runCount = (rule.runCount || 0) + 1;
      rule.lastRunAt = new Date();
      await rule.save();
    }
  } catch (err) {
    console.error('HRM workflow engine error:', err);
  }
}
