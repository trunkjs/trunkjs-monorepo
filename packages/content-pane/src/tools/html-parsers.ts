/**
 * Parse simple CSS selector prefix from start of string
 * - Tag optional (defaults to div)
 * - Supports #id, multiple .classes (with - and :)
 * - Optional attribute parsing; throws if disabled and attribute found
 * - Returns attrs array + attrsMap for direct lookup
 * - Returns rest of string that was not parsed
 *
 * @param sel         Selector string
 * @param options     { allowAttributes?: boolean, ignoreGaps?: boolean }
 *
 * @example
 * parseSelector('div.main#app.other[data-id=123] foo', { ignoreGaps: false })
 * // {
 * //   tag:'div', id:'app', classes:['main','other'],
 * //   attrs:[{name:'data-id',value:'123'}],
 * //   attrsMap:{'data-id':'123'},
 * //   length:29, rest:' foo'
 * // }
 */
export function parseSelector(
  sel: string,
  { allowAttributes = true, ignoreGaps = true } = {},
): {
  tag: string;
  id: string | null;
  classes: string[];
  attrs: { name: string; value?: string }[];
  attrsMap: Record<string, string | undefined>;
  length: number;
  rest: string;
} {
  let tag = 'div',
    id: string | null = null,
    classes: string[] = [],
    attrs: { name: string; value?: string }[] = [],
    attrsMap: Record<string, string | undefined> = {};

  const regex = /(^[a-z][\w-]*)|#[\w-]+|\.[\w:-]+|\[\s*([\w-]+)(?:\s*=\s*(['"]?)(.*?)\3)?\s*\]/gi;

  let i = 0;
  while (true) {
    const m = regex.exec(sel);
    if (!m || m.index !== i) {
      if (!ignoreGaps && m && m.index > i)
        break; // stop on gap
      else break; // no more match
    }

    const s = m[0];
    if (s[0] === '#') id = s.slice(1);
    else if (s[0] === '.') classes.push(s.slice(1));
    else if (s[0] === '[') {
      if (!allowAttributes) throw new Error(`Attributes not allowed: '${s}'`);
      const name = m[2];
      const value = m[4] || undefined;
      attrs.push({ name, value });
      attrsMap[name] = value;
    } else tag = s; // tag
    i += s.length;
  }

  return { tag, id, classes, attrs, attrsMap, length: i, rest: sel.slice(i) };
}
