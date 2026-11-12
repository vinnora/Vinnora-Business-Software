/**
 * RFC 4180 CSV parsing / writing. Client-safe (no imports).
 *
 * parseCsv handles: UTF-8 BOM, quoted fields, escaped quotes (""), commas and
 * line breaks inside quotes, CRLF / LF / CR line endings, and a trailing newline.
 * Blank lines are skipped.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  // The current field started with a quote (so `""` is an empty value, not a blank line).
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const n = text.length;

  const endField = () => {
    row.push(field);
    field = '';
    quoted = false;
  };
  const endRow = () => {
    const blankLine = row.length === 0 && field === '' && !quoted;
    endField();
    if (!blankLine) rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === '' && !quoted) {
      inQuotes = true;
      quoted = true;
      i++;
      continue;
    }
    if (ch === ',') {
      endField();
      i++;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      endRow();
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    // A stray quote inside an unquoted field (or after a closing quote) is kept literally.
    field += ch;
    i++;
  }
  // Last row when the file doesn't end with a newline.
  if (field !== '' || quoted || row.length) endRow();
  return rows;
}

/** Format a single value as CSV text (before quoting). Dates → ISO, arrays → `a;b`. */
export function csvValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString();
  if (Array.isArray(v)) return v.map((x) => csvValue(x)).join(';');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function quote(s: string): string {
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build CSV text (CRLF line endings) with a header row.
 * Rows may be arrays (positional, same order as headers) or objects keyed by header.
 */
export function toCsv(rows: (unknown[] | Record<string, unknown>)[], headers: string[]): string {
  const lines = [headers.map((h) => quote(h)).join(',')];
  for (const r of rows) {
    const cells = Array.isArray(r) ? headers.map((_, i) => r[i]) : headers.map((h) => r[h]);
    lines.push(cells.map((c) => quote(csvValue(c))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
