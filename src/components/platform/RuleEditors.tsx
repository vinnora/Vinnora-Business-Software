'use client';

import { useMemo, useRef, useState } from 'react';
import { checkFormula, FUNCTIONS } from '@/lib/platform/formula';
import { validateLogic } from '@/lib/platform/conditions';
import {
  OPERATOR_LABELS,
  USER_TOKENS,
  VALUELESS_OPERATORS,
  type Condition,
  type ConditionOperator,
  type FieldDescribe,
} from '@/lib/platform/types';
import { Btn, Checkbox, Input, Select, TextArea } from './ui';

/* ------------------------------------------------------------------ */
/* Condition builder                                                   */
/* ------------------------------------------------------------------ */

const TEXT_OPS: ConditionOperator[] = ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'in', 'notIn', 'isEmpty', 'isNotEmpty'];
const NUM_OPS: ConditionOperator[] = ['equals', 'notEquals', 'greaterThan', 'greaterOrEqual', 'lessThan', 'lessOrEqual', 'isEmpty', 'isNotEmpty'];

export function operatorsFor(f?: FieldDescribe): ConditionOperator[] {
  if (!f) return TEXT_OPS;
  const t = f.type === 'formula' ? f.returnType || 'text' : f.type;
  switch (t) {
    case 'number':
    case 'currency':
    case 'percent':
    case 'date':
    case 'datetime':
      return NUM_OPS;
    case 'checkbox':
      return ['equals', 'notEquals'];
    case 'picklist':
      return ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'];
    case 'multipicklist':
      return ['contains', 'notContains', 'isEmpty', 'isNotEmpty'];
    case 'lookup':
      return ['equals', 'notEquals', 'in', 'isEmpty', 'isNotEmpty'];
    default:
      return TEXT_OPS;
  }
}

function ValueInput({
  field,
  cond,
  onChange,
  allowUserTokens,
}: {
  field?: FieldDescribe;
  cond: Condition;
  onChange: (v: string) => void;
  allowUserTokens?: boolean;
}) {
  const isToken = (cond.value || '').startsWith('$User.');
  if (VALUELESS_OPERATORS.includes(cond.operator)) {
    return <div className="text-xs text-gray-400 px-2 py-1.5">no value needed</div>;
  }
  const type = field?.type === 'formula' ? field.returnType : field?.type;
  const multi = cond.operator === 'in' || cond.operator === 'notIn';

  let input: React.ReactNode;
  if (isToken) {
    input = (
      <Select value={cond.value} onChange={(e) => onChange(e.target.value)}>
        {USER_TOKENS.map((t) => (
          <option key={t.token} value={t.token}>
            {t.label} ({t.token})
          </option>
        ))}
      </Select>
    );
  } else if (type === 'checkbox') {
    input = (
      <Select value={cond.value || 'true'} onChange={(e) => onChange(e.target.value)}>
        <option value="true">True</option>
        <option value="false">False</option>
      </Select>
    );
  } else if ((type === 'picklist' || type === 'multipicklist') && field?.picklistValues?.length && !multi) {
    input = (
      <Select value={cond.value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— choose —</option>
        {field.picklistValues.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label || p.value}
          </option>
        ))}
      </Select>
    );
  } else if ((type === 'date' || type === 'datetime') && !multi) {
    input = <Input type="date" value={(cond.value || '').slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
  } else {
    input = (
      <Input
        value={cond.value || ''}
        placeholder={multi ? 'value1, value2, …' : 'value'}
        type={['number', 'currency', 'percent'].includes(type || '') && !multi ? 'number' : 'text'}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <div className="flex gap-1">
      <div className="flex-1 min-w-0">{input}</div>
      {allowUserTokens && type !== 'checkbox' && (
        <button
          type="button"
          title={isToken ? 'Use a fixed value' : 'Compare to the current user'}
          onClick={() => onChange(isToken ? '' : '$User.Id')}
          className={`px-2 text-xs rounded border ${isToken ? 'border-[var(--p-accent)] text-[var(--p-accent)] bg-[var(--p-accent-bg)]' : 'border-gray-300 text-gray-500'}`}
        >
          $User
        </button>
      )}
    </div>
  );
}

export function ConditionBuilder({
  fields,
  conditions,
  onChange,
  logic,
  onLogicChange,
  allowUserTokens,
}: {
  fields: FieldDescribe[];
  conditions: Condition[];
  onChange: (c: Condition[]) => void;
  logic: string;
  onLogicChange: (l: string) => void;
  allowUserTokens?: boolean;
}) {
  const byApi = useMemo(() => Object.fromEntries(fields.map((f) => [f.apiName, f])), [fields]);
  const [customLogic, setCustomLogic] = useState(Boolean(logic));
  const logicError = customLogic && conditions.length ? validateLogic(logic, conditions.length) : null;

  const update = (i: number, patch: Partial<Condition>) => onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const add = () => {
    const f = fields[0];
    onChange([...conditions, { field: f?.apiName || '', operator: operatorsFor(f)[0], value: '' }]);
  };

  return (
    <div>
      <div className="space-y-2">
        {conditions.map((c, i) => {
          const f = byApi[c.field];
          const ops = operatorsFor(f);
          return (
            <div key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_2rem] gap-2 items-start">
              <div className="text-xs font-semibold text-gray-500 pt-2 text-center">{i + 1}</div>
              <Select
                value={c.field}
                onChange={(e) => {
                  const nf = byApi[e.target.value];
                  const nops = operatorsFor(nf);
                  update(i, { field: e.target.value, operator: nops.includes(c.operator) ? c.operator : nops[0], value: '' });
                }}
              >
                {fields.map((fd) => (
                  <option key={fd.apiName} value={fd.apiName}>
                    {fd.label}
                  </option>
                ))}
              </Select>
              <Select className="sm:col-start-auto col-start-2" value={c.operator} onChange={(e) => update(i, { operator: e.target.value as ConditionOperator })}>
                {ops.map((o) => (
                  <option key={o} value={o}>
                    {OPERATOR_LABELS[o]}
                  </option>
                ))}
              </Select>
              <div className="col-start-2 sm:col-start-auto">
                <ValueInput field={f} cond={c} onChange={(v) => update(i, { value: v })} allowUserTokens={allowUserTokens} />
              </div>
              <button
                type="button"
                onClick={() => onChange(conditions.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-red-600 text-lg leading-none pt-1 col-start-2 sm:col-start-auto justify-self-start"
                aria-label={`Remove condition ${i + 1}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <Btn size="sm" variant="ghost" onClick={add}>
          + Add condition
        </Btn>
        {conditions.length > 1 && (
          <Checkbox
            checked={customLogic}
            onChange={(v) => {
              setCustomLogic(v);
              if (!v) onLogicChange('');
              else if (!logic) onLogicChange(conditions.map((_, i) => i + 1).join(' AND '));
            }}
            label={<span className="text-xs">Use custom logic</span>}
          />
        )}
      </div>
      {customLogic && conditions.length > 1 && (
        <div className="mt-2">
          <Input value={logic} onChange={(e) => onLogicChange(e.target.value)} placeholder="e.g. 1 AND (2 OR 3)" className="font-mono" />
          <div className={`text-xs mt-1 ${logicError ? 'text-red-600' : 'text-gray-500'}`}>
            {logicError || 'Use condition numbers with AND, OR, NOT and parentheses.'}
          </div>
        </div>
      )}
      {!customLogic && conditions.length > 1 && <div className="text-xs text-gray-500 mt-1">All conditions must be met (AND).</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formula editor                                                      */
/* ------------------------------------------------------------------ */

const OPERATORS = ['+', '-', '*', '/', '^', '&', '=', '<>', '<', '>', '<=', '>=', '&&', '||', '(', ')'];

export function FormulaEditor({
  value,
  onChange,
  fields,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  fields: FieldDescribe[];
  hint?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [fnCategory, setFnCategory] = useState('Logical');
  const categories = useMemo(() => [...new Set(Object.values(FUNCTIONS).map((f) => f.category))], []);

  const insert = (text: string) => {
    const el = ref.current;
    if (!el) return onChange(value + text);
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    setResult(null);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + text.length;
    });
  };

  const check = () => setResult(checkFormula(value, fields.map((f) => f.apiName)));

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div>
        <div className="flex flex-wrap gap-1 mb-2">
          <Select
            className="!w-auto text-xs"
            value=""
            onChange={(e) => {
              if (e.target.value) insert(e.target.value);
            }}
          >
            <option value="">Insert field…</option>
            {fields.map((f) => (
              <option key={f.apiName} value={f.apiName}>
                {f.label} ({f.apiName})
              </option>
            ))}
            <optgroup label="Current user">
              {USER_TOKENS.map((t) => (
                <option key={t.token} value={t.token}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </Select>
          {OPERATORS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => insert(op.length === 1 && !'()'.includes(op) ? ` ${op} ` : op)}
              className="px-2 py-1 text-xs font-mono border border-gray-300 rounded bg-white hover:bg-gray-50"
            >
              {op}
            </button>
          ))}
        </div>
        <TextArea
          ref={ref}
          rows={7}
          value={value}
          spellCheck={false}
          onChange={(e) => {
            onChange(e.target.value);
            setResult(null);
          }}
          className="font-mono text-[13px]"
          placeholder={hint || 'AND(ISPICKVAL(status, "Qualified"), ISBLANK(email))'}
        />
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <Btn size="sm" onClick={check}>
            Check Syntax
          </Btn>
          {result && (
            <span className={`text-xs ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
              {result.ok ? '✓ No syntax errors' : result.error}
            </span>
          )}
        </div>
      </div>
      <div className="border border-[var(--p-border)] rounded bg-gray-50 p-2 text-xs">
        <div className="font-semibold text-gray-700 mb-1">Functions</div>
        <Select className="!py-1 text-xs mb-2" value={fnCategory} onChange={(e) => setFnCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {Object.entries(FUNCTIONS)
            .filter(([, f]) => f.category === fnCategory)
            .map(([name, f]) => (
              <button
                key={name}
                type="button"
                onClick={() => insert(`${name}(`)}
                className="block w-full text-left px-1.5 py-1 rounded hover:bg-white"
                title={f.doc}
              >
                <div className="font-mono text-[var(--p-accent)]">{f.sig}</div>
                <div className="text-gray-500">{f.doc}</div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
