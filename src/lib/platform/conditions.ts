/**
 * Point-and-click conditions with custom logic ("1 AND (2 OR NOT 3)").
 * - evaluateConditions(): in-memory (validation rules)
 * - conditionsToMongo(): query filter (restriction rules)
 * Client-safe.
 */
import type { Condition, FieldDescribe } from './types';

/* ------------------------------------------------------------------ */
/* Logic expression                                                    */
/* ------------------------------------------------------------------ */

export type LogicNode =
  | { k: 'ref'; i: number }
  | { k: 'and'; items: LogicNode[] }
  | { k: 'or'; items: LogicNode[] }
  | { k: 'not'; e: LogicNode };

export class LogicError extends Error {}

export function parseLogic(logic: string | undefined, count: number): LogicNode {
  if (!logic || !logic.trim()) {
    return { k: 'and', items: Array.from({ length: count }, (_, i) => ({ k: 'ref', i: i + 1 }) as LogicNode) };
  }
  const toks = logic.toUpperCase().match(/\d+|AND|OR|NOT|\(|\)|\S/g) || [];
  let pos = 0;
  const peek = () => toks[pos];
  const used = new Set<number>();

  const parseOr = (): LogicNode => {
    const items = [parseAnd()];
    while (peek() === 'OR') {
      pos++;
      items.push(parseAnd());
    }
    return items.length === 1 ? items[0] : { k: 'or', items };
  };
  const parseAnd = (): LogicNode => {
    const items = [parseNot()];
    while (peek() === 'AND') {
      pos++;
      items.push(parseNot());
    }
    return items.length === 1 ? items[0] : { k: 'and', items };
  };
  const parseNot = (): LogicNode => {
    if (peek() === 'NOT') {
      pos++;
      return { k: 'not', e: parseNot() };
    }
    return parseAtom();
  };
  const parseAtom = (): LogicNode => {
    const t = toks[pos++];
    if (t === undefined) throw new LogicError('Filter logic ended unexpectedly');
    if (t === '(') {
      const e = parseOr();
      if (toks[pos++] !== ')') throw new LogicError("Missing ')' in filter logic");
      return e;
    }
    if (/^\d+$/.test(t)) {
      const i = Number(t);
      if (i < 1 || i > count) throw new LogicError(`Filter logic references condition ${i}, which doesn't exist`);
      used.add(i);
      return { k: 'ref', i };
    }
    throw new LogicError(`Unexpected '${t}' in filter logic`);
  };

  const node = parseOr();
  if (pos < toks.length) throw new LogicError(`Unexpected '${toks[pos]}' in filter logic`);
  for (let i = 1; i <= count; i++) {
    if (!used.has(i)) throw new LogicError(`Condition ${i} is not used in the filter logic`);
  }
  return node;
}

export function validateLogic(logic: string | undefined, count: number): string | null {
  try {
    parseLogic(logic, count);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/* ------------------------------------------------------------------ */
/* Relative date literals                                              */
/* ------------------------------------------------------------------ */

export const DATE_LITERALS = [
  'TODAY',
  'YESTERDAY',
  'TOMORROW',
  'THIS_WEEK',
  'LAST_WEEK',
  'NEXT_WEEK',
  'THIS_MONTH',
  'LAST_MONTH',
  'NEXT_MONTH',
  'THIS_QUARTER',
  'LAST_QUARTER',
  'NEXT_QUARTER',
  'THIS_YEAR',
  'LAST_YEAR',
  'NEXT_YEAR',
  'LAST_N_DAYS:n',
  'NEXT_N_DAYS:n',
];

const DAY = 86400000;

/** Resolve a relative date literal (UTC) to a [start, end) range, or null if not a literal. */
export function resolveDateLiteral(value: unknown, now = new Date()): [Date, Date] | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toUpperCase();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const range = (a: number, b: number): [Date, Date] => [new Date(a), new Date(b)];
  const weekStart = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY; // Monday
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const q = Math.floor(m / 3) * 3;
  const nDays = /^(LAST|NEXT)_N_DAYS:(\d{1,4})$/.exec(v);
  if (nDays) {
    const n = Number(nDays[2]);
    return nDays[1] === 'LAST' ? range(today - (n - 1) * DAY, today + DAY) : range(today, today + (n + 1) * DAY);
  }
  switch (v) {
    case 'TODAY':
      return range(today, today + DAY);
    case 'YESTERDAY':
      return range(today - DAY, today);
    case 'TOMORROW':
      return range(today + DAY, today + 2 * DAY);
    case 'THIS_WEEK':
      return range(weekStart, weekStart + 7 * DAY);
    case 'LAST_WEEK':
      return range(weekStart - 7 * DAY, weekStart);
    case 'NEXT_WEEK':
      return range(weekStart + 7 * DAY, weekStart + 14 * DAY);
    case 'THIS_MONTH':
      return range(Date.UTC(y, m, 1), Date.UTC(y, m + 1, 1));
    case 'LAST_MONTH':
      return range(Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1));
    case 'NEXT_MONTH':
      return range(Date.UTC(y, m + 1, 1), Date.UTC(y, m + 2, 1));
    case 'THIS_QUARTER':
      return range(Date.UTC(y, q, 1), Date.UTC(y, q + 3, 1));
    case 'LAST_QUARTER':
      return range(Date.UTC(y, q - 3, 1), Date.UTC(y, q, 1));
    case 'NEXT_QUARTER':
      return range(Date.UTC(y, q + 3, 1), Date.UTC(y, q + 6, 1));
    case 'THIS_YEAR':
      return range(Date.UTC(y, 0, 1), Date.UTC(y + 1, 0, 1));
    case 'LAST_YEAR':
      return range(Date.UTC(y - 1, 0, 1), Date.UTC(y, 0, 1));
    case 'NEXT_YEAR':
      return range(Date.UTC(y + 1, 0, 1), Date.UTC(y + 2, 0, 1));
    default:
      return null;
  }
}

function isDateField(f: FieldDescribe | undefined) {
  const t = f?.type === 'formula' ? f.returnType : f?.type;
  return t === 'date' || t === 'datetime';
}

/* ------------------------------------------------------------------ */
/* Value handling                                                      */
/* ------------------------------------------------------------------ */

const TEXTUAL = new Set(['text', 'textarea', 'email', 'phone', 'url', 'picklist', 'lookup']);
const NUMERIC = new Set(['number', 'currency', 'percent']);

export function resolveToken(value: string | undefined, user: Record<string, unknown> | undefined): unknown {
  if (value === undefined || value === null) return '';
  const v = String(value).trim();
  if (v.startsWith('$User.')) {
    const key = v.slice(6);
    const found = user ? Object.keys(user).find((k) => k.toLowerCase() === key.toLowerCase()) : undefined;
    return found ? user![found] : '';
  }
  return v;
}

function coerce(raw: unknown, field: FieldDescribe | undefined): unknown {
  const type = field?.type === 'formula' ? field.returnType || 'text' : field?.type;
  if (raw === '' || raw === null || raw === undefined) return raw;
  if (type && NUMERIC.has(type)) {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  if (type === 'date' || type === 'datetime') {
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? raw : d;
  }
  if (type === 'checkbox') return String(raw).toLowerCase() === 'true';
  return String(raw);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isBlankValue(v: unknown) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function splitList(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* In-memory evaluation                                                */
/* ------------------------------------------------------------------ */

function getPath(record: Record<string, unknown>, path: string): unknown {
  if (path in record) return record[path];
  return path.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), record);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

function comparable(x: unknown): unknown {
  if (x instanceof Date) return x.getTime();
  if (typeof x === 'string' && ISO_DATE.test(x) && !Number.isNaN(Date.parse(x))) return Date.parse(x);
  return x;
}

function cmp(a: unknown, b: unknown): number | null {
  if (isBlankValue(a) || isBlankValue(b)) return null;
  const na = Number(comparable(a));
  const nb = Number(comparable(b));
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

function textEq(a: unknown, b: unknown) {
  return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
}

export function evaluateCondition(
  c: Condition,
  record: Record<string, unknown>,
  field: FieldDescribe | undefined,
  user?: Record<string, unknown>,
): boolean {
  const actual = getPath(record, c.field);
  const literal = isDateField(field) ? resolveDateLiteral(c.value) : null;
  if (literal) {
    if (isBlankValue(actual)) return c.operator === 'notEquals' || c.operator === 'isEmpty';
    const t = new Date(String(actual instanceof Date ? actual.toISOString() : actual)).getTime();
    const [s, e] = [literal[0].getTime(), literal[1].getTime()];
    switch (c.operator) {
      case 'equals':
        return t >= s && t < e;
      case 'notEquals':
        return t < s || t >= e;
      case 'greaterThan':
        return t >= e;
      case 'greaterOrEqual':
        return t >= s;
      case 'lessThan':
        return t < s;
      case 'lessOrEqual':
        return t < e;
    }
  }
  const expectedRaw = resolveToken(c.value, user);
  const expected = coerce(expectedRaw, field);
  const multi = field?.type === 'multipicklist' || Array.isArray(actual);
  const list = Array.isArray(actual) ? actual.map(String) : [];

  switch (c.operator) {
    case 'isEmpty':
      return isBlankValue(actual);
    case 'isNotEmpty':
      return !isBlankValue(actual);
    case 'equals':
      if (multi) return list.some((x) => textEq(x, expected));
      if (expected instanceof Date || actual instanceof Date) return cmp(actual, expected) === 0;
      if (typeof expected === 'number' || typeof expected === 'boolean') return actual === expected || String(actual) === String(expected);
      return isBlankValue(expected) ? isBlankValue(actual) : textEq(actual, expected);
    case 'notEquals':
      return !evaluateCondition({ ...c, operator: 'equals' }, record, field, user);
    case 'contains':
      if (multi) return list.some((x) => textEq(x, expected));
      return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
    case 'notContains':
      return !evaluateCondition({ ...c, operator: 'contains' }, record, field, user);
    case 'startsWith':
      return String(actual ?? '').toLowerCase().startsWith(String(expected ?? '').toLowerCase());
    case 'greaterThan': {
      const r = cmp(actual, expected);
      return r !== null && r > 0;
    }
    case 'greaterOrEqual': {
      const r = cmp(actual, expected);
      return r !== null && r >= 0;
    }
    case 'lessThan': {
      const r = cmp(actual, expected);
      return r !== null && r < 0;
    }
    case 'lessOrEqual': {
      const r = cmp(actual, expected);
      return r !== null && r <= 0;
    }
    case 'in': {
      const values = splitList(c.value).map((v) => String(resolveToken(v, user)));
      if (multi) return list.some((x) => values.some((v) => textEq(x, v)));
      return values.some((v) => textEq(actual, v));
    }
    case 'notIn':
      return !evaluateCondition({ ...c, operator: 'in' }, record, field, user);
    default:
      return false;
  }
}

function evalNode(node: LogicNode, results: boolean[]): boolean {
  switch (node.k) {
    case 'ref':
      return results[node.i - 1];
    case 'and':
      return node.items.every((n) => evalNode(n, results));
    case 'or':
      return node.items.some((n) => evalNode(n, results));
    case 'not':
      return !evalNode(node.e, results);
  }
}

export function evaluateConditions(
  conditions: Condition[],
  logic: string | undefined,
  record: Record<string, unknown>,
  fieldsByApi: Record<string, FieldDescribe>,
  user?: Record<string, unknown>,
): boolean {
  if (!conditions.length) return false;
  const results = conditions.map((c) => evaluateCondition(c, record, fieldsByApi[c.field], user));
  return evalNode(parseLogic(logic, conditions.length), results);
}

/* ------------------------------------------------------------------ */
/* Mongo translation                                                   */
/* ------------------------------------------------------------------ */

type Filter = Record<string, unknown>;

function blankFilter(path: string): Filter {
  return { $or: [{ [path]: { $exists: false } }, { [path]: null }, { [path]: '' }, { [path]: { $size: 0 } }] };
}

function conditionToMongo(c: Condition, field: FieldDescribe | undefined, user?: Record<string, unknown>): Filter {
  const path = field?.path || c.field;
  const type = field?.type === 'formula' ? field.returnType || 'text' : field?.type || 'text';
  const textual = TEXTUAL.has(type) || type === 'multipicklist';
  const expectedRaw = resolveToken(c.value, user);
  const expected = coerce(expectedRaw, field);
  const exactRe = (v: unknown) => new RegExp(`^${escapeRegex(String(v))}$`, 'i');

  const literal = isDateField(field) ? resolveDateLiteral(c.value) : null;
  if (literal) {
    const [s, e] = literal;
    switch (c.operator) {
      case 'equals':
        return { [path]: { $gte: s, $lt: e } };
      case 'notEquals':
        return { $or: [{ [path]: { $lt: s } }, { [path]: { $gte: e } }, blankFilter(path)] };
      case 'greaterThan':
        return { [path]: { $gte: e } };
      case 'greaterOrEqual':
        return { [path]: { $gte: s } };
      case 'lessThan':
        return { [path]: { $lt: s } };
      case 'lessOrEqual':
        return { [path]: { $lt: e } };
    }
  }

  switch (c.operator) {
    case 'isEmpty':
      return blankFilter(path);
    case 'isNotEmpty':
      return { $nor: [blankFilter(path)] };
    case 'equals':
      if (isBlankValue(expected)) return blankFilter(path);
      return { [path]: textual ? exactRe(expected) : expected };
    case 'notEquals':
      if (isBlankValue(expected)) return { $nor: [blankFilter(path)] };
      return { [path]: textual ? { $not: exactRe(expected) } : { $ne: expected } };
    case 'contains':
      if (type === 'multipicklist') return { [path]: exactRe(expected) };
      return { [path]: { $regex: escapeRegex(String(expected ?? '')), $options: 'i' } };
    case 'notContains':
      if (type === 'multipicklist') return { [path]: { $not: exactRe(expected) } };
      return { [path]: { $not: new RegExp(escapeRegex(String(expected ?? '')), 'i') } };
    case 'startsWith':
      return { [path]: { $regex: `^${escapeRegex(String(expected ?? ''))}`, $options: 'i' } };
    case 'greaterThan':
      return { [path]: { $gt: expected } };
    case 'greaterOrEqual':
      return { [path]: { $gte: expected } };
    case 'lessThan':
      return { [path]: { $lt: expected } };
    case 'lessOrEqual':
      return { [path]: { $lte: expected } };
    case 'in': {
      const values = splitList(c.value).map((v) => coerce(resolveToken(v, user), field));
      return { [path]: { $in: textual ? values.map(exactRe) : values } };
    }
    case 'notIn': {
      const values = splitList(c.value).map((v) => coerce(resolveToken(v, user), field));
      return { [path]: { $nin: textual ? values.map(exactRe) : values } };
    }
    default:
      // Unknown operator: match nothing (fail closed).
      return { _id: { $exists: false } };
  }
}

function nodeToMongo(node: LogicNode, parts: Filter[]): Filter {
  switch (node.k) {
    case 'ref':
      return parts[node.i - 1];
    case 'and':
      return { $and: node.items.map((n) => nodeToMongo(n, parts)) };
    case 'or':
      return { $or: node.items.map((n) => nodeToMongo(n, parts)) };
    case 'not':
      return { $nor: [nodeToMongo(node.e, parts)] };
  }
}

export function conditionsToMongo(
  conditions: Condition[],
  logic: string | undefined,
  fieldsByApi: Record<string, FieldDescribe>,
  user?: Record<string, unknown>,
): Filter {
  if (!conditions.length) return {};
  const parts = conditions.map((c) => conditionToMongo(c, fieldsByApi[c.field], user));
  return nodeToMongo(parseLogic(logic, conditions.length), parts);
}
