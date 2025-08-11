type StyleEntry = [prop: string, value: string, priority?: 'important'];

export function parseStyleAttribute(styleText: string): StyleEntry[] {
  const out: StyleEntry[] = [];
  let buf = '',
    decls: string[] = [];
  let q: "'" | '"' | null = null,
    depth = 0;

  // split on ; not inside quotes/parens
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
        depth = Math.max(0, depth - 1);
        buf += ch;
      } else if (ch === ';' && depth === 0) {
        decls.push(buf);
        buf = '';
      } else buf += ch;
    }
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
        else if (ch === ')') depth = Math.max(0, depth - 1);
        else if (ch === ':' && depth === 0) {
          i = k;
          break;
        }
      }
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
