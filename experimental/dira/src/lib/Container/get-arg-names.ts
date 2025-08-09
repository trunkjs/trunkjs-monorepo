// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ArgMeta = { isOptional: boolean; hasDefault: boolean };

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getArgNames(fn: Function): Record<string, ArgMeta> {
  // Convert function to string and normalize
  const src = fn
    .toString()
    // remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // remove block comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  let paramsSrc: string | null = null;

  // Match classic function declaration/expression
  if (/^\s*function\b/.test(src)) {
    const m = src.match(/function[^(]*\(([^)]*)\)/);
    if (m) paramsSrc = m[1];
  }
  // Match arrow function with parentheses: (a, b) => ...
  if (paramsSrc == null && /^\s*\(/.test(src)) {
    const m = src.match(/^\s*\(([^)]*)\)\s*=>/);
    if (m) paramsSrc = m[1];
  }
  // Match arrow function single param: a => ...
  if (paramsSrc == null) {
    const m = src.match(/^\s*([A-Za-z_$][\w$]*)\s*=>/);
    if (m) paramsSrc = m[1];
  }
  // Match class constructor: class X { constructor(a, b) { ... } }
  if (paramsSrc == null && /^\s*class\b/.test(src)) {
    const m = src.match(/constructor\s*\(([^)]*)\)/);
    if (m) paramsSrc = m[1];
  }

  const result: Record<string, ArgMeta> = {};
  if (paramsSrc == null || paramsSrc.trim() === '') return result;

  // Split by commas that are not inside (), {}, [], or strings
  const parts: string[] = [];
  let buf = '';
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let inStr: '"' | "'" | '`' | null = null;
  let escape = false;

  for (let i = 0; i < paramsSrc.length; i++) {
    const ch = paramsSrc[i];

    if (inStr) {
      buf += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inStr) {
        inStr = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch as '"' | "'" | '`';
      buf += ch;
      continue;
    }

    if (ch === '(') depthParen++;
    else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
    else if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
    else if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);

    if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      parts.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim() !== '') parts.push(buf.trim());

  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;

    // Skip destructured params; not resolvable via token name
    if (p.startsWith('{') || p.startsWith('[')) {
      continue;
    }

    // Extract:
    // - optional marker (?)
    // - default (= ...)
    // - param name
    const m = p.match(/^(?:\.\.\.)?\s*([A-Za-z_$][\w$]*)\s*(\?)?\s*(?::[^=]+)?\s*(=\s*[\s\S]+)?$/);
    if (!m) {
      continue;
    }

    const name = m[1];
    const hasOptMark = !!m[2];
    const hasDefault = m[3] != null;

    // isOptional is true if explicitly marked optional or has a default
    result[name] = {
      isOptional: hasOptMark || hasDefault,
      hasDefault: hasDefault,
    };
  }

  return result;
}
