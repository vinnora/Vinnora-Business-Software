import type { Tenant } from '@/lib/tenant';

type Filter = Record<string, unknown>;

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** True for a 24-hex record id (e.g. an itemId stored on a document line). */
export function isObjectIdString(v: unknown): v is string {
  return typeof v === 'string' && OBJECT_ID.test(v);
}

/**
 * Workspace filter for the legacy InventoryItem / StockAdjustment models, whose `userId` is an ObjectId
 * (and which have no `orgId`). t.where() lists every member's email and id as legacy owner keys; the
 * emails cannot be cast to ObjectId and would make the whole query fail, so only the ids are kept.
 */
export function objectIdWhere(t: Tenant, extra?: Filter): Filter {
  const base = keepObjectIdOwners(t.where()) as Filter;
  return extra && Object.keys(extra).length ? { $and: [base, extra] } : base;
}

function keepObjectIdOwners(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(keepObjectIdOwners);
  if (!node || typeof node !== 'object' || node.constructor !== Object) return node;
  const out: Filter = {};
  for (const [k, v] of Object.entries(node as Filter)) {
    const inList = k === 'userId' && v && typeof v === 'object' ? (v as { $in?: unknown }).$in : undefined;
    if (Array.isArray(inList)) {
      out[k] = { $in: inList.filter((x) => typeof x === 'string' && OBJECT_ID.test(x)) };
    } else {
      out[k] = keepObjectIdOwners(v);
    }
  }
  return out;
}
