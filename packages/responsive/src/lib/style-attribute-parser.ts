export type StyleEntry = [prop: string, value: string, priority?: 'important'];

export class StyleParseError extends Error {
  constructor(
    message: string,
    public context?: {
      index?: number;
      input?: string;
      near?: string;
      declaration?: string;
    },
  ) {
    super(message);
    this.name = 'StyleParseError';
  }
}

export class StyleDeclarationError extends StyleParseError {
  constructor(
    message: string,
    context?: {
      index?: number;
      input?: string;
      near?: string;
      declaration?: string;
    },
  ) {
    super(message, context);
    this.name = 'StyleDeclarationError';
  }
}

export function getStyleEntryAsString(entry: StyleEntry | StyleEntry[]): string {
  if ((entry as StyleEntry[]).length === 0) return '';
  if (Array.isArray(entry[0])) {
    return (entry as StyleEntry[])
      .map((e) => getStyleEntryAsString(e))
      .filter((s) => s)
      .join('; ');
  } else {
    const [prop, value, priority] = entry as StyleEntry;
    return `${prop}: ${value}${priority ? ' !' + priority : ''}`;
  }
}

export function getSTyleEntryValueAsString(entry: StyleEntry): string {
  return entry[1] + (entry[2] ? ' !' + entry[2] : '');
}

export interface ParseStyleOptions {
  strict?: boolean; // if true, throw on parse anomalies
}

/**
 * Robustly parse a style attribute string into entries.
 * - Default mode: robust, skips malformed pieces (backwards compatible).
 * - Strict mode (opts.strict=true): throws informative errors on anomalies.
 */
export function parseStyleAttribute(styleText: string, opts?: ParseStyleOptions): StyleEntry[] {
  const strict = !!opts?.strict;

  const throwIf = (condition: boolean, err: Error) => {
    if (condition && strict) throw err;
    return condition;
  };

  const out: StyleEntry[] = [];
  let buf = '';
  const decls: string[] = [];
  let q: "'" | '"' | null = null,
    depth = 0;

  // split on ; not inside quotes/parens
  // Track index for better error context
  let idx = 0;
  for (const ch of styleText) {
    if (q) {
      if (ch === q) q = null;
      buf += ch;
    } else {
      if (ch === "'" || ch === '"') {
        q = ch;
        buf += ch;
      } else if (ch === '(') {
        depth++;
        buf += ch;
      } else if (ch === ')') {
        if (throwIf(depth === 0, new StyleParseError('Unmatched closing parenthesis )', withCtx(idx, styleText)))) {
          // in strict mode we already threw; in non-strict just clamp to 0 (skip behaviour)
        }
        depth = Math.max(0, depth - 1);
        buf += ch;
      } else if (ch === ';' && depth === 0) {
        decls.push(buf);
        buf = '';
      } else buf += ch;
    }
    idx++;
  }

  // End-of-input validations
  if (throwIf(q !== null, new StyleParseError('Unclosed quote', withCtx(idx - 1, styleText)))) {
    // noop
  }
  if (throwIf(depth > 0, new StyleParseError('Unbalanced parentheses: missing )', withCtx(idx - 1, styleText)))) {
    // noop
  }

  if (buf.trim()) decls.push(buf);

  for (const raw of decls) {
    const s = raw.trim();
    if (!s) continue;

    // split on first : not inside quotes/parens
    let i = -1;
    q = null;
    depth = 0;

    for (let k = 0; k < s.length; k++) {
      const ch = s[k];
      if (q) {
        if (ch === q) q = null;
      } else {
        if (ch === "'" || ch === '"') q = ch;
        else if (ch === '(') depth++;
        else if (ch === ')') {
          if (
            throwIf(
              depth === 0,
              new StyleDeclarationError('Unmatched closing parenthesis ) in declaration', { declaration: s }),
            )
          ) {
            // noop
          }
          depth = Math.max(0, depth - 1);
        } else if (ch === ':' && depth === 0) {
          i = k;
          break;
        }
      }
    }

    // Missing colon in declaration
    if (throwIf(i < 1, new StyleDeclarationError('Missing colon (:) in declaration', { declaration: s }))) {
      if (i < 1) continue; // non-strict: skip malformed declaration
    }
    if (i < 1) continue;

    const prop = s.slice(0, i).trim();
    let value = s.slice(i + 1).trim();
    let priority: 'important' | undefined;

    if (/\s*!important\s*$/i.test(value)) {
      value = value.replace(/\s*!important\s*$/i, '').trim();
      priority = 'important';
    }
    if (prop) out.push([prop, value, priority]);
  }

  return out;
}

function withCtx(index: number, input: string) {
  const start = Math.max(0, index - 15);
  const end = Math.min(input.length, index + 15);
  return {
    index,
    input,
    near: input.slice(start, end),
  };
}
