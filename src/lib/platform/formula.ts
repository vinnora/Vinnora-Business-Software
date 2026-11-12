/**
 * Formula engine.
 *
 * Supports:
 *  - literals: 12, 3.5, "text", 'text', TRUE, FALSE, NULL
 *  - field references: Status, annualRevenue, rating__c, $User.Id
 *  - operators: + - * / ^ & = == != <> < <= > >= && || !
 *  - functions: see FUNCTIONS below (AND, OR, IF, CASE, ISBLANK, ISPICKVAL, ISCHANGED, PRIORVALUE, TEXT, ...)
 *
 * Client-safe: no imports.
 */

export class FormulaError extends Error {
  pos: number;
  constructor(message: string, pos = -1) {
    super(message);
    this.name = 'FormulaError';
    this.pos = pos;
  }
}

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

type TokType = 'num' | 'str' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma' | 'eof';
interface Token {
  t: TokType;
  v: string;
  pos: number;
}

const TWO_CHAR_OPS = ['==', '!=', '<>', '<=', '>=', '&&', '||'];
const ONE_CHAR_OPS = ['+', '-', '*', '/', '^', '&', '=', '<', '>', '!'];

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    // comments: /* ... */
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) throw new FormulaError('Unclosed comment', i);
      i = end + 2;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const start = i;
      while (i < src.length && /[0-9.]/.test(src[i])) i++;
      out.push({ t: 'num', v: src.slice(start, i), pos: start });
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      const start = i;
      i++;
      let s = '';
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < src.length) {
          const n = src[i + 1];
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n;
          i += 2;
        } else {
          s += src[i++];
        }
      }
      if (i >= src.length) throw new FormulaError('Unclosed string literal', start);
      i++;
      out.push({ t: 'str', v: s, pos: start });
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const start = i;
      while (i < src.length && /[A-Za-z0-9_$.]/.test(src[i])) i++;
      out.push({ t: 'ident', v: src.slice(start, i), pos: start });
      continue;
    }
    if (c === '(') {
      out.push({ t: 'lparen', v: c, pos: i++ });
      continue;
    }
    if (c === ')') {
      out.push({ t: 'rparen', v: c, pos: i++ });
      continue;
    }
    if (c === ',') {
      out.push({ t: 'comma', v: c, pos: i++ });
      continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO_CHAR_OPS.includes(two)) {
      out.push({ t: 'op', v: two, pos: i });
      i += 2;
      continue;
    }
    if (ONE_CHAR_OPS.includes(c)) {
      out.push({ t: 'op', v: c, pos: i++ });
      continue;
    }
    throw new FormulaError(`Unexpected character '${c}'`, i);
  }
  out.push({ t: 'eof', v: '', pos: src.length });
  return out;
}

/* ------------------------------------------------------------------ */
/* Parser (Pratt)                                                      */
/* ------------------------------------------------------------------ */

export type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'bool'; v: boolean }
  | { k: 'null' }
  | { k: 'ref'; name: string; pos: number }
  | { k: 'call'; name: string; args: Node[]; pos: number }
  | { k: 'bin'; op: string; l: Node; r: Node }
  | { k: 'un'; op: string; e: Node };

const BIN_PREC: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '=': 3,
  '==': 3,
  '!=': 3,
  '<>': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '&': 5,
  '*': 6,
  '/': 6,
  '^': 7,
};

class Parser {
  private i = 0;
  private toks: Token[];
  constructor(toks: Token[]) {
    this.toks = toks;
  }

  private peek() {
    return this.toks[this.i];
  }
  private next() {
    return this.toks[this.i++];
  }
  private expect(t: TokType, what: string) {
    const tok = this.next();
    if (tok.t !== t) throw new FormulaError(`Expected ${what} but found '${tok.v || 'end of formula'}'`, tok.pos);
    return tok;
  }

  parse(): Node {
    const n = this.expr(0);
    const tok = this.peek();
    if (tok.t !== 'eof') throw new FormulaError(`Unexpected '${tok.v}'`, tok.pos);
    return n;
  }

  private expr(minPrec: number): Node {
    let left = this.unary();
    for (;;) {
      const tok = this.peek();
      if (tok.t !== 'op') break;
      const prec = BIN_PREC[tok.v];
      if (prec === undefined || prec < minPrec) break;
      this.next();
      // ^ is right-associative
      const right = this.expr(tok.v === '^' ? prec : prec + 1);
      left = { k: 'bin', op: tok.v, l: left, r: right };
    }
    return left;
  }

  private unary(): Node {
    const tok = this.peek();
    if (tok.t === 'op' && (tok.v === '-' || tok.v === '!' || tok.v === '+')) {
      this.next();
      const e = this.expr(8);
      return tok.v === '+' ? e : { k: 'un', op: tok.v, e };
    }
    return this.primary();
  }

  private primary(): Node {
    const tok = this.next();
    switch (tok.t) {
      case 'num': {
        const v = Number(tok.v);
        if (Number.isNaN(v)) throw new FormulaError(`Invalid number '${tok.v}'`, tok.pos);
        return { k: 'num', v };
      }
      case 'str':
        return { k: 'str', v: tok.v };
      case 'lparen': {
        const e = this.expr(0);
        this.expect('rparen', "')'");
        return e;
      }
      case 'ident': {
        const upper = tok.v.toUpperCase();
        if (this.peek().t === 'lparen') {
          this.next();
          const args: Node[] = [];
          if (this.peek().t !== 'rparen') {
            for (;;) {
              args.push(this.expr(0));
              if (this.peek().t === 'comma') {
                this.next();
                continue;
              }
              break;
            }
          }
          this.expect('rparen', "')'");
          return { k: 'call', name: upper, args, pos: tok.pos };
        }
        if (upper === 'TRUE') return { k: 'bool', v: true };
        if (upper === 'FALSE') return { k: 'bool', v: false };
        if (upper === 'NULL') return { k: 'null' };
        return { k: 'ref', name: tok.v, pos: tok.pos };
      }
      default:
        throw new FormulaError(tok.t === 'eof' ? 'Formula ended unexpectedly' : `Unexpected '${tok.v}'`, tok.pos);
    }
  }
}

export function parseFormula(src: string): Node {
  if (!src || !src.trim()) throw new FormulaError('Formula is empty', 0);
  return new Parser(tokenize(src)).parse();
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

export interface FormulaContext {
  record: Record<string, unknown>;
  /** Previous version of the record (for ISCHANGED / PRIORVALUE). null/undefined = new record. */
  prior?: Record<string, unknown> | null;
  /** Values for $User.* references (keys without the prefix, e.g. Id, Email). */
  user?: Record<string, unknown>;
  now?: Date;
}

type Val = number | string | boolean | Date | null | unknown[];

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'number' && Number.isNaN(v));
}

function toNum(v: unknown): number | null {
  if (isBlank(v)) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.getTime();
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function toStr(v: unknown): string {
  if (isBlank(v)) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.join(';');
  return String(v);
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (isBlank(v)) return false;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return Boolean(v);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

function toDate(v: unknown): Date | null {
  if (isBlank(v)) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string' && ISO_DATE.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'number') return new Date(v);
  return null;
}

function looksLikeDate(v: unknown): boolean {
  return v instanceof Date || (typeof v === 'string' && ISO_DATE.test(v));
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const DAY_MS = 86400000;

function looseEquals(a: unknown, b: unknown): boolean {
  if (isBlank(a) && isBlank(b)) return true;
  if (isBlank(a) || isBlank(b)) return false;
  if (looksLikeDate(a) && looksLikeDate(b)) return toDate(a)!.getTime() === toDate(b)!.getTime();
  if (typeof a === 'number' || typeof b === 'number') return toNum(a) === toNum(b);
  if (typeof a === 'boolean' || typeof b === 'boolean') return toBool(a) === toBool(b);
  return toStr(a) === toStr(b);
}

function compare(a: unknown, b: unknown): number | null {
  if (isBlank(a) || isBlank(b)) return null;
  if (looksLikeDate(a) && looksLikeDate(b)) return toDate(a)!.getTime() - toDate(b)!.getTime();
  const na = toNum(a);
  const nb = toNum(b);
  if (na !== null && nb !== null) return na - nb;
  return toStr(a).localeCompare(toStr(b));
}

function lookup(obj: Record<string, unknown> | null | undefined, name: string): { found: boolean; value: unknown } {
  if (!obj) return { found: false, value: null };
  if (name in obj) return { found: true, value: obj[name] };
  const lower = name.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) return { found: true, value: obj[k] };
  }
  // dotted path, e.g. custom.rating__c
  if (name.includes('.')) {
    const parts = name.split('.');
    let cur: unknown = obj;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return { found: false, value: null };
      }
    }
    return { found: true, value: cur };
  }
  return { found: false, value: null };
}

function resolveRef(name: string, ctx: FormulaContext, source: 'record' | 'prior' = 'record'): unknown {
  if (name.startsWith('$User.')) {
    return lookup(ctx.user, name.slice(6)).value ?? null;
  }
  const obj = source === 'prior' ? ctx.prior : ctx.record;
  const v = lookup(obj, name).value;
  return v === undefined ? null : v;
}

type Fn = (args: Node[], ctx: FormulaContext, ev: (n: Node) => Val) => Val;

function argCount(name: string, args: Node[], min: number, max = min) {
  if (args.length < min || args.length > max) {
    const want = min === max ? `${min}` : max === Infinity ? `at least ${min}` : `${min}-${max}`;
    throw new FormulaError(`${name}() expects ${want} argument(s), got ${args.length}`);
  }
}

function refName(fn: string, n: Node): string {
  if (n.k !== 'ref') throw new FormulaError(`${fn}() expects a field name as its first argument`);
  return n.name;
}

export const FUNCTIONS: Record<string, { fn: Fn; min: number; max: number; sig: string; doc: string; category: string }> = {
  AND: { min: 1, max: Infinity, sig: 'AND(logical1, logical2, ...)', doc: 'TRUE if all values are true.', category: 'Logical',
    fn: (a, _c, ev) => a.every((n) => toBool(ev(n))) },
  OR: { min: 1, max: Infinity, sig: 'OR(logical1, logical2, ...)', doc: 'TRUE if any value is true.', category: 'Logical',
    fn: (a, _c, ev) => a.some((n) => toBool(ev(n))) },
  NOT: { min: 1, max: 1, sig: 'NOT(logical)', doc: 'Reverses a true/false value.', category: 'Logical',
    fn: (a, _c, ev) => !toBool(ev(a[0])) },
  IF: { min: 3, max: 3, sig: 'IF(test, if_true, if_false)', doc: 'Returns one of two values.', category: 'Logical',
    fn: (a, _c, ev) => (toBool(ev(a[0])) ? ev(a[1]) : ev(a[2])) },
  CASE: { min: 4, max: Infinity, sig: 'CASE(expr, value1, result1, ..., else_result)', doc: 'Matches expr against values.', category: 'Logical',
    fn: (a, _c, ev) => {
      if (a.length % 2 !== 0) throw new FormulaError('CASE() needs an else result as its last argument');
      const v = ev(a[0]);
      for (let i = 1; i < a.length - 1; i += 2) if (looseEquals(v, ev(a[i]))) return ev(a[i + 1]);
      return ev(a[a.length - 1]);
    } },
  ISBLANK: { min: 1, max: 1, sig: 'ISBLANK(expr)', doc: 'TRUE if the value is empty.', category: 'Logical',
    fn: (a, _c, ev) => isBlank(ev(a[0])) },
  ISNULL: { min: 1, max: 1, sig: 'ISNULL(expr)', doc: 'Same as ISBLANK.', category: 'Logical',
    fn: (a, _c, ev) => isBlank(ev(a[0])) },
  BLANKVALUE: { min: 2, max: 2, sig: 'BLANKVALUE(expr, substitute)', doc: 'Substitute when expr is blank.', category: 'Logical',
    fn: (a, _c, ev) => { const v = ev(a[0]); return isBlank(v) ? ev(a[1]) : v; } },
  NULLVALUE: { min: 2, max: 2, sig: 'NULLVALUE(expr, substitute)', doc: 'Same as BLANKVALUE.', category: 'Logical',
    fn: (a, _c, ev) => { const v = ev(a[0]); return isBlank(v) ? ev(a[1]) : v; } },
  ISNUMBER: { min: 1, max: 1, sig: 'ISNUMBER(text)', doc: 'TRUE if text is a number.', category: 'Logical',
    fn: (a, _c, ev) => { const v = ev(a[0]); return !isBlank(v) && !Number.isNaN(Number(v)); } },
  ISPICKVAL: { min: 2, max: 2, sig: 'ISPICKVAL(dropdown_field, "value")', doc: 'TRUE if the dropdown equals the value.', category: 'Logical',
    fn: (a, _c, ev) => toStr(ev(a[0])) === toStr(ev(a[1])) },
  INCLUDES: { min: 2, max: 2, sig: 'INCLUDES(multiselect_field, "value")', doc: 'TRUE if the multi-select contains the value.', category: 'Logical',
    fn: (a, _c, ev) => {
      const v = ev(a[0]);
      const list = Array.isArray(v) ? v.map(toStr) : toStr(v).split(';');
      return list.includes(toStr(ev(a[1])));
    } },
  ISNEW: { min: 0, max: 0, sig: 'ISNEW()', doc: 'TRUE when the record is being created.', category: 'Logical',
    fn: (_a, c) => !c.prior },
  ISCHANGED: { min: 1, max: 1, sig: 'ISCHANGED(field)', doc: 'TRUE if the field value changed in this save.', category: 'Logical',
    fn: (a, c) => {
      const name = refName('ISCHANGED', a[0]);
      if (!c.prior) return false;
      return !looseEquals(resolveRef(name, c), resolveRef(name, c, 'prior'));
    } },
  PRIORVALUE: { min: 1, max: 1, sig: 'PRIORVALUE(field)', doc: 'The value before this save.', category: 'Logical',
    fn: (a, c) => {
      const name = refName('PRIORVALUE', a[0]);
      return (c.prior ? resolveRef(name, c, 'prior') : resolveRef(name, c)) as Val;
    } },

  LEN: { min: 1, max: 1, sig: 'LEN(text)', doc: 'Number of characters.', category: 'Text',
    fn: (a, _c, ev) => toStr(ev(a[0])).length },
  LEFT: { min: 2, max: 2, sig: 'LEFT(text, n)', doc: 'First n characters.', category: 'Text',
    fn: (a, _c, ev) => toStr(ev(a[0])).slice(0, Math.max(0, toNum(ev(a[1])) ?? 0)) },
  RIGHT: { min: 2, max: 2, sig: 'RIGHT(text, n)', doc: 'Last n characters.', category: 'Text',
    fn: (a, _c, ev) => { const s = toStr(ev(a[0])); const n = Math.max(0, toNum(ev(a[1])) ?? 0); return n === 0 ? '' : s.slice(-n); } },
  MID: { min: 3, max: 3, sig: 'MID(text, start, length)', doc: 'Characters from a 1-based start.', category: 'Text',
    fn: (a, _c, ev) => { const s = toStr(ev(a[0])); const st = (toNum(ev(a[1])) ?? 1) - 1; return s.substr(Math.max(0, st), Math.max(0, toNum(ev(a[2])) ?? 0)); } },
  UPPER: { min: 1, max: 1, sig: 'UPPER(text)', doc: 'Upper-case text.', category: 'Text',
    fn: (a, _c, ev) => toStr(ev(a[0])).toUpperCase() },
  LOWER: { min: 1, max: 1, sig: 'LOWER(text)', doc: 'Lower-case text.', category: 'Text',
    fn: (a, _c, ev) => toStr(ev(a[0])).toLowerCase() },
  TRIM: { min: 1, max: 1, sig: 'TRIM(text)', doc: 'Removes leading/trailing spaces.', category: 'Text',
    fn: (a, _c, ev) => toStr(ev(a[0])).trim() },
  CONTAINS: { min: 2, max: 2, sig: 'CONTAINS(text, compare_text)', doc: 'TRUE if text contains compare_text.', category: 'Text',
    fn: (a, _c, ev) => toStr(ev(a[0])).includes(toStr(ev(a[1]))) },
  BEGINS: { min: 2, max: 2, sig: 'BEGINS(text, compare_text)', doc: 'TRUE if text starts with compare_text.', category: 'Text',
    fn: (a, _c, ev) => toStr(ev(a[0])).startsWith(toStr(ev(a[1]))) },
  FIND: { min: 2, max: 3, sig: 'FIND(search_text, text [, start])', doc: '1-based position of search_text, 0 if missing.', category: 'Text',
    fn: (a, _c, ev) => { const st = a[2] ? (toNum(ev(a[2])) ?? 1) - 1 : 0; return toStr(ev(a[1])).indexOf(toStr(ev(a[0])), st) + 1; } },
  SUBSTITUTE: { min: 3, max: 3, sig: 'SUBSTITUTE(text, old, new)', doc: 'Replaces all occurrences.', category: 'Text',
    fn: (a, _c, ev) => { const old = toStr(ev(a[1])); return old ? toStr(ev(a[0])).split(old).join(toStr(ev(a[2]))) : toStr(ev(a[0])); } },
  TEXT: { min: 1, max: 1, sig: 'TEXT(value)', doc: 'Converts a value to text.', category: 'Text',
    fn: (a, _c, ev) => toStr(ev(a[0])) },
  VALUE: { min: 1, max: 1, sig: 'VALUE(text)', doc: 'Converts text to a number.', category: 'Text',
    fn: (a, _c, ev) => toNum(ev(a[0])) },
  REGEX: { min: 2, max: 2, sig: 'REGEX(text, regex)', doc: 'TRUE if the whole text matches the regular expression.', category: 'Text',
    fn: (a, _c, ev) => {
      const pattern = toStr(ev(a[1]));
      try {
        return new RegExp(`^(?:${pattern})$`).test(toStr(ev(a[0])));
      } catch {
        throw new FormulaError(`Invalid regular expression: ${pattern}`);
      }
    } },

  ABS: { min: 1, max: 1, sig: 'ABS(number)', doc: 'Absolute value.', category: 'Math',
    fn: (a, _c, ev) => { const n = toNum(ev(a[0])); return n === null ? null : Math.abs(n); } },
  ROUND: { min: 2, max: 2, sig: 'ROUND(number, digits)', doc: 'Rounds to the given digits.', category: 'Math',
    fn: (a, _c, ev) => { const n = toNum(ev(a[0])); if (n === null) return null; const f = 10 ** (toNum(ev(a[1])) ?? 0); return Math.round(n * f) / f; } },
  CEILING: { min: 1, max: 1, sig: 'CEILING(number)', doc: 'Rounds up.', category: 'Math',
    fn: (a, _c, ev) => { const n = toNum(ev(a[0])); return n === null ? null : Math.ceil(n); } },
  FLOOR: { min: 1, max: 1, sig: 'FLOOR(number)', doc: 'Rounds down.', category: 'Math',
    fn: (a, _c, ev) => { const n = toNum(ev(a[0])); return n === null ? null : Math.floor(n); } },
  MAX: { min: 1, max: Infinity, sig: 'MAX(n1, n2, ...)', doc: 'Largest number.', category: 'Math',
    fn: (a, _c, ev) => { const ns = a.map((n) => toNum(ev(n))).filter((n): n is number => n !== null); return ns.length ? Math.max(...ns) : null; } },
  MIN: { min: 1, max: Infinity, sig: 'MIN(n1, n2, ...)', doc: 'Smallest number.', category: 'Math',
    fn: (a, _c, ev) => { const ns = a.map((n) => toNum(ev(n))).filter((n): n is number => n !== null); return ns.length ? Math.min(...ns) : null; } },
  MOD: { min: 2, max: 2, sig: 'MOD(number, divisor)', doc: 'Remainder.', category: 'Math',
    fn: (a, _c, ev) => { const n = toNum(ev(a[0])); const d = toNum(ev(a[1])); return n === null || !d ? null : n % d; } },
  SQRT: { min: 1, max: 1, sig: 'SQRT(number)', doc: 'Square root.', category: 'Math',
    fn: (a, _c, ev) => { const n = toNum(ev(a[0])); return n === null ? null : Math.sqrt(n); } },

  TODAY: { min: 0, max: 0, sig: 'TODAY()', doc: "Today's date.", category: 'Date',
    fn: (_a, c) => startOfDay(c.now ?? new Date()) },
  NOW: { min: 0, max: 0, sig: 'NOW()', doc: 'Current date and time.', category: 'Date',
    fn: (_a, c) => c.now ?? new Date() },
  DATE: { min: 3, max: 3, sig: 'DATE(year, month, day)', doc: 'Builds a date.', category: 'Date',
    fn: (a, _c, ev) => new Date(Date.UTC(toNum(ev(a[0])) ?? 1970, (toNum(ev(a[1])) ?? 1) - 1, toNum(ev(a[2])) ?? 1)) },
  DATEVALUE: { min: 1, max: 1, sig: 'DATEVALUE(text_or_datetime)', doc: 'Converts to a date.', category: 'Date',
    fn: (a, _c, ev) => { const d = toDate(ev(a[0])); return d ? startOfDay(d) : null; } },
  YEAR: { min: 1, max: 1, sig: 'YEAR(date)', doc: 'Year of a date.', category: 'Date',
    fn: (a, _c, ev) => toDate(ev(a[0]))?.getUTCFullYear() ?? null },
  MONTH: { min: 1, max: 1, sig: 'MONTH(date)', doc: 'Month (1-12).', category: 'Date',
    fn: (a, _c, ev) => { const d = toDate(ev(a[0])); return d ? d.getUTCMonth() + 1 : null; } },
  DAY: { min: 1, max: 1, sig: 'DAY(date)', doc: 'Day of month.', category: 'Date',
    fn: (a, _c, ev) => toDate(ev(a[0]))?.getUTCDate() ?? null },
  WEEKDAY: { min: 1, max: 1, sig: 'WEEKDAY(date)', doc: 'Day of week (1 = Sunday).', category: 'Date',
    fn: (a, _c, ev) => { const d = toDate(ev(a[0])); return d ? d.getUTCDay() + 1 : null; } },
  ADDMONTHS: { min: 2, max: 2, sig: 'ADDMONTHS(date, n)', doc: 'Adds n months.', category: 'Date',
    fn: (a, _c, ev) => { const d = toDate(ev(a[0])); if (!d) return null; const r = new Date(d); r.setUTCMonth(r.getUTCMonth() + (toNum(ev(a[1])) ?? 0)); return r; } },
};

function evaluateNode(n: Node, ctx: FormulaContext): Val {
  const ev = (x: Node) => evaluateNode(x, ctx);
  switch (n.k) {
    case 'num':
      return n.v;
    case 'str':
      return n.v;
    case 'bool':
      return n.v;
    case 'null':
      return null;
    case 'ref':
      return resolveRef(n.name, ctx) as Val;
    case 'call': {
      const f = FUNCTIONS[n.name];
      if (!f) throw new FormulaError(`Unknown function ${n.name}()`, n.pos);
      argCount(n.name, n.args, f.min, f.max);
      return f.fn(n.args, ctx, ev);
    }
    case 'un': {
      const v = ev(n.e);
      if (n.op === '!') return !toBool(v);
      const num = toNum(v);
      return num === null ? null : -num;
    }
    case 'bin': {
      if (n.op === '&&') return toBool(ev(n.l)) && toBool(ev(n.r));
      if (n.op === '||') return toBool(ev(n.l)) || toBool(ev(n.r));
      const l = ev(n.l);
      const r = ev(n.r);
      switch (n.op) {
        case '&':
          return toStr(l) + toStr(r);
        case '=':
        case '==':
          return looseEquals(l, r);
        case '!=':
        case '<>':
          return !looseEquals(l, r);
        case '<': {
          const c = compare(l, r);
          return c !== null && c < 0;
        }
        case '<=': {
          const c = compare(l, r);
          return c !== null && c <= 0;
        }
        case '>': {
          const c = compare(l, r);
          return c !== null && c > 0;
        }
        case '>=': {
          const c = compare(l, r);
          return c !== null && c >= 0;
        }
        case '+': {
          if (looksLikeDate(l) && !looksLikeDate(r)) {
            const d = toDate(l)!;
            return new Date(d.getTime() + (toNum(r) ?? 0) * DAY_MS);
          }
          if (typeof l === 'string' && typeof r === 'string' && (Number.isNaN(Number(l)) || Number.isNaN(Number(r)))) {
            return l + r;
          }
          const a = toNum(l);
          const b = toNum(r);
          return a === null || b === null ? null : a + b;
        }
        case '-': {
          if (looksLikeDate(l) && looksLikeDate(r)) {
            return (toDate(l)!.getTime() - toDate(r)!.getTime()) / DAY_MS;
          }
          if (looksLikeDate(l)) {
            return new Date(toDate(l)!.getTime() - (toNum(r) ?? 0) * DAY_MS);
          }
          const a = toNum(l);
          const b = toNum(r);
          return a === null || b === null ? null : a - b;
        }
        case '*': {
          const a = toNum(l);
          const b = toNum(r);
          return a === null || b === null ? null : a * b;
        }
        case '/': {
          const a = toNum(l);
          const b = toNum(r);
          if (a === null || b === null) return null;
          if (b === 0) throw new FormulaError('Division by zero');
          return a / b;
        }
        case '^': {
          const a = toNum(l);
          const b = toNum(r);
          return a === null || b === null ? null : a ** b;
        }
      }
      throw new FormulaError(`Unknown operator ${n.op}`);
    }
  }
}

const parseCache = new Map<string, Node>();

export function evaluateFormula(src: string | Node, ctx: FormulaContext): Val {
  let node: Node;
  if (typeof src === 'string') {
    const cached = parseCache.get(src);
    if (cached) {
      node = cached;
    } else {
      node = parseFormula(src);
      if (parseCache.size > 500) parseCache.clear();
      parseCache.set(src, node);
    }
  } else {
    node = src;
  }
  return evaluateNode(node, ctx);
}

/** Evaluate and coerce to boolean (validation rules: TRUE = error). */
export function evaluateBoolean(src: string, ctx: FormulaContext): boolean {
  return toBool(evaluateFormula(src, ctx));
}

/** Coerce a formula result for a formula field's declared return type. */
export function coerceFormulaResult(v: unknown, returnType: string | undefined): unknown {
  switch (returnType) {
    case 'number':
    case 'currency':
    case 'percent': {
      const n = toNum(v);
      return n === null || !Number.isFinite(n) ? null : n;
    }
    case 'checkbox':
      return toBool(v);
    case 'date': {
      const d = toDate(v);
      return d ? d.toISOString().slice(0, 10) : null;
    }
    default:
      return isBlank(v) ? null : toStr(v);
  }
}

/* ------------------------------------------------------------------ */
/* Syntax check                                                        */
/* ------------------------------------------------------------------ */

function collect(n: Node, refs: Set<string>, calls: { name: string; argc: number; pos: number }[]) {
  switch (n.k) {
    case 'ref':
      refs.add(n.name);
      break;
    case 'call':
      calls.push({ name: n.name, argc: n.args.length, pos: n.pos });
      n.args.forEach((a) => collect(a, refs, calls));
      break;
    case 'bin':
      collect(n.l, refs, calls);
      collect(n.r, refs, calls);
      break;
    case 'un':
      collect(n.e, refs, calls);
      break;
  }
}

export interface FormulaCheckResult {
  ok: boolean;
  error?: string;
  pos?: number;
  references: string[];
}

/**
 * Validate syntax, function names/arity and field references.
 * @param fieldNames known field api names for the object (case-insensitive match).
 */
export function checkFormula(src: string, fieldNames: string[]): FormulaCheckResult {
  try {
    const node = parseFormula(src);
    const refs = new Set<string>();
    const calls: { name: string; argc: number; pos: number }[] = [];
    collect(node, refs, calls);
    for (const c of calls) {
      const f = FUNCTIONS[c.name];
      if (!f) return { ok: false, error: `Unknown function ${c.name}()`, pos: c.pos, references: [...refs] };
      try {
        argCount(c.name, new Array(c.argc), f.min, f.max);
      } catch (e) {
        return { ok: false, error: (e as Error).message, pos: c.pos, references: [...refs] };
      }
    }
    const lower = new Set(fieldNames.map((f) => f.toLowerCase()));
    const userKeys = ['id', 'email', 'name', 'profileid', 'role'];
    for (const r of refs) {
      if (r.startsWith('$User.')) {
        if (!userKeys.includes(r.slice(6).toLowerCase())) {
          return { ok: false, error: `Unknown user field ${r}`, references: [...refs] };
        }
        continue;
      }
      if (!lower.has(r.toLowerCase())) {
        return { ok: false, error: `Field ${r} does not exist on this module`, references: [...refs] };
      }
    }
    return { ok: true, references: [...refs] };
  } catch (e) {
    const err = e as FormulaError;
    return { ok: false, error: err.message, pos: err.pos, references: [] };
  }
}
