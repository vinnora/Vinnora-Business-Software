import AppConnection from '@/models/AppConnection';
import type { VinnoraApp } from '@/models/AppConnection';

/**
 * Cross-app connection engine.
 * After a record event in one module, this engine checks for active connections
 * that should trigger actions in other modules.
 * Best-effort: failures never block the source operation.
 */

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
    default: return false;
  }
}

function mapFields(record: any, mapping: Array<{ sourceField: string; targetField: string }>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const m of mapping) {
    result[m.targetField] = getField(record, m.sourceField);
  }
  return result;
}

async function executeTargetAction(
  targetApp: VinnoraApp,
  targetAction: string,
  mappedData: Record<string, any>,
  userId: string
) {
  // Log the cross-app action for now. In production, this would call the target module's API internally.
  console.log(`[AppConnection] ${targetApp}/${targetAction}:`, JSON.stringify(mappedData).slice(0, 200));

  // Future: direct model creation based on targetApp + targetAction
  // Example: if targetApp === 'accounting' && targetAction === 'createInvoice'
  //   → Invoice.create({ ...mappedData, userId })
}

export async function runAppConnections(opts: {
  sourceApp: VinnoraApp;
  sourceObject: string;
  event: string;
  record: any;
  userId: string;
  /** Workspace filter from getTenant().where(); when given, the workspace's connections run instead of only this user's. */
  scope?: Record<string, unknown>;
}) {
  try {
    const { sourceApp, sourceObject, event, record, userId, scope } = opts;
    const match = { sourceApp, sourceObject, sourceEvent: event, active: true };
    const connections = await AppConnection.find(scope ? { $and: [scope, match] } : { userId, ...match });

    for (const conn of connections) {
      // Check conditions if any
      if (conn.conditions && conn.conditions.length > 0) {
        const pass = conn.conditions.every((c: any) => evalCondition(record, c));
        if (!pass) continue;
      }

      // Map fields from source to target
      const mappedData = mapFields(record, conn.fieldMapping);

      // Execute target action
      await executeTargetAction(conn.targetApp, conn.targetAction, mappedData, userId);

      // Track execution
      conn.runCount = (conn.runCount || 0) + 1;
      conn.lastRunAt = new Date();
      await conn.save();
    }
  } catch (err) {
    console.error('App connection engine error:', err);
  }
}
