import WorkflowRule, { IWorkflowCondition, IWorkflowAction, WorkflowObject, WorkflowEvent } from '@/models/WorkflowRule';
import Activity from '@/models/Activity';
import Case from '@/models/Case';
import WorkOrder from '@/models/WorkOrder';

/**
 * Lightweight rule engine. Runs after CRUD on tracked objects.
 * Designed to be best-effort: failures never block the user request.
 */

function getField(obj: any, path: string): any {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function evalCondition(record: any, c: IWorkflowCondition): boolean {
  const v = getField(record, c.field);
  switch (c.operator) {
    case 'equals':
      return String(v) === String(c.value);
    case 'notEquals':
      return String(v) !== String(c.value);
    case 'contains':
      return String(v ?? '').toLowerCase().includes(String(c.value ?? '').toLowerCase());
    case 'greaterThan':
      return Number(v) > Number(c.value);
    case 'lessThan':
      return Number(v) < Number(c.value);
    case 'isEmpty':
      return v == null || v === '' || (Array.isArray(v) && v.length === 0);
    case 'isNotEmpty':
      return !(v == null || v === '' || (Array.isArray(v) && v.length === 0));
    default:
      return false;
  }
}

function evalConditions(record: any, conditions: IWorkflowCondition[], logic: 'AND' | 'OR'): boolean {
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

async function executeAction(
  action: IWorkflowAction,
  record: any,
  objectType: WorkflowObject,
  userId: string,
  orgId?: string
) {
  const params = action.params || {};
  // Stamp the tenant on anything we create when the caller knows it.
  const owner = orgId ? { userId, orgId } : { userId };
  switch (action.type) {
    case 'createActivity': {
      await Activity.create({
        ...owner,
        type: params.type || 'Task',
        subject: interpolate(params.subject || `Follow up on ${objectType}`, record),
        status: 'Open',
        priority: params.priority || 'Normal',
        dueDate: params.dueInDays
          ? new Date(Date.now() + Number(params.dueInDays) * 24 * 60 * 60 * 1000)
          : undefined,
        relatedToType: objectType,
        relatedToId: String(record._id),
        relatedToName: record.name || `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim() || record.subject,
        description: interpolate(params.description || '', record),
      });
      break;
    }
    case 'updateField': {
      if (!params.field) break;
      record[params.field] = interpolate(String(params.value ?? ''), record) || params.value;
      await record.save();
      break;
    }
    case 'assignOwner': {
      record.ownerId = params.ownerId;
      record.ownerName = params.ownerName;
      await record.save();
      break;
    }
    case 'sendEmail': {
      // No SMTP wired — log as a Completed Email activity so it shows in the timeline.
      await Activity.create({
        ...owner,
        type: 'Email',
        subject: interpolate(params.subject || `Email to ${record.email ?? 'customer'}`, record),
        status: 'Completed',
        completedAt: new Date(),
        relatedToType: objectType,
        relatedToId: String(record._id),
        relatedToName: record.name || `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim(),
        description: interpolate(params.body || '', record),
        emailFrom: params.from,
        emailTo: record.email ? [record.email] : [],
      });
      break;
    }
    case 'escalateCase': {
      if (objectType !== 'Case') break;
      record.escalated = true;
      record.status = 'Escalated';
      if (params.priority) record.priority = params.priority;
      await record.save();
      break;
    }
    case 'createWorkOrder': {
      if (objectType !== 'Case') break;
      const num = `WO-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, '0')}`;
      await WorkOrder.create({
        ...owner,
        workOrderNumber: num,
        subject: interpolate(params.subject || record.subject, record),
        status: 'New',
        priority: record.priority || 'Medium',
        caseId: String(record._id),
        caseNumber: record.caseNumber,
        accountId: record.accountId,
        accountName: record.accountName,
        contactId: record.contactId,
        contactName: record.contactName,
        contactPhone: record.contactPhone,
      });
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
      } catch {
        // swallow
      }
      break;
    }
  }
}

export async function runWorkflows(opts: {
  objectType: WorkflowObject;
  event: WorkflowEvent;
  record: any;
  userId: string;
  /** Tenant key. When given, org-wide rules (or legacy rules owned by `userId`) match. */
  orgId?: string;
  changedFields?: string[];
}) {
  try {
    const { objectType, event, record, userId, orgId, changedFields } = opts;
    // In a sandbox only the sandbox's own rules run (never production rules / webhooks).
    const filter: any = orgId?.startsWith('sbx:')
      ? { orgId, objectType, active: true }
      : orgId
      ? { $or: [{ orgId }, { userId }], objectType, active: true }
      : { userId, objectType, active: true };
    if (event === 'fieldChanged') {
      filter.triggerEvent = { $in: ['fieldChanged', 'updated'] };
    } else {
      filter.triggerEvent = event;
    }

    const rules = await WorkflowRule.find(filter);
    for (const rule of rules) {
      // For fieldChanged rules, require the watched field to be in changed list
      if (rule.triggerEvent === 'fieldChanged') {
        if (!rule.watchFields || rule.watchFields.length === 0) continue;
        if (!changedFields || !changedFields.some((f) => rule.watchFields!.includes(f))) continue;
      }

      if (!evalConditions(record, rule.conditions, rule.conditionLogic)) continue;

      for (const action of rule.actions) {
        await executeAction(action, record, objectType, userId, orgId);
      }
      rule.runCount = (rule.runCount || 0) + 1;
      rule.lastRunAt = new Date();
      await rule.save();
    }
  } catch (err) {
    console.error('Workflow engine error:', err);
  }
}
