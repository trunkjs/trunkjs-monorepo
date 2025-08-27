---
slugName: style-attribute-parser-tests-and-exceptions
includeFiles:
- ./src/lib/style-attribute-parser.ts
- ./src/lib/tests/style-attribute-parser.spec.ts
- ./vite.config.ts
editFiles:
- ./src/lib/style-attribute-parser.ts
- ./src/lib/tests/style-attribute-parser.spec.ts
original_prompt: schreibe unittests für style-attribute-parser und ändere diesen,
  dass er aussagekraeftige exceptions wirft
---
# Prepare: Unit-Tests und aussagekräftige Exceptions für style-attribute-parser

Kurzziel:
- Schreibe Unit-Tests für den Style-Attribute-Parser.
- Erweitere den Parser so, dass er in einem strikten Modus (strict) aussagekräftige Exceptions wirft (inkl. Kontext), ohne bestehende Aufrufe zu brechen.

## Assumptions

- Die aktuelle Funktion parseStyleAttribute wird von der Laufzeit verwendet. Um Backwards-Compatibility sicherzustellen, wird standardmäßig kein Throwing aktiviert (weiterhin “skip/robust”). Ein optionaler Strict-Modus (opts.strict: true) kann aktiviert werden, der bei Fehlern Exceptions wirft.
- Fehlerfälle: Unbalancierte Klammern, ungeschlossene Quotes, fehlender Doppelpunkt in Deklarationen, unerwartete schließende Klammer.
- Die Exceptions sollen Typen haben, die im Test gezielt geprüft werden können (z. B. StyleParseError, StyleDeclarationError) und hilfreichen Kontext (near, input, index, declaration) enthalten.
- Tests werden mit vitest in jsdom-Umgebung ausgeführt (bereits konfiguriert).

Beispiel, wie die ursprüngliche Anfrage präzisiert werden könnte:
- “Bitte werfe im Strict-Mode Exceptions bei unbalancierten Klammern, ungeschlossenen Quotes und Deklarationen ohne Doppelpunkt.”
- “Die Exceptions sollen Name, Nachricht und Kontext (z. B. index, declaration, near) liefern. Schreibe Vitest-Tests, die diese Fälle abdecken.”

## Tasks

- Parser um Exceptions erweitern: Strict-Mode hinzufügen und Fehler mit Kontext werfen
- Unit-Tests: Erfolgs- und Fehlerfälle, inkl. !important, Quotes, Klammern, fehlender Doppelpunkt

## Overview: File changes

- ./src/lib/style-attribute-parser.ts Strict-Mode, Fehlerklassen, präzise Fehler mit Kontext, unveränderte Default-Kompatibilität
- ./src/lib/tests/style-attribute-parser.spec.ts Neue Vitest-Spezifikation: Valid-Parsing, !important, Quotes, Klammern, Fehlerfälle im Strict-Mode

## Detail changes

### ./src/lib/style-attribute-parser.ts

Referenced Tasks
- Parser um Exceptions erweitern Strict-Mode und Fehlerklassen hinzufügen, aussagekräftige Fehler werfen

Replace entire file with:

```typescript
export type StyleEntry = [prop: string, value: string, priority?: 'important'];

export class StyleParseError extends Error {
  constructor(
    message: string,
    public context?: {
      index?: number;
      input?: string;
      near?: string;
      declaration?: string;
    }
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
    }
  ) {
    super(message, context);
    this.name = 'StyleDeclarationError';
  }
}

export function getStyleEntryAsString(entry: StyleEntry | StyleEntry[]): string {
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

export function getSTyleEntryValueAsString(entry: StyleEntry | StyleEntry[]): string {
  if (Array.isArray(entry[0])) {
    return (entry as StyleEntry[])
      .map((e) => getSTyleEntryValueAsString(e))
      .filter((s) => s)
      .join('; ');
  } else {
    const [, value] = entry as StyleEntry;
    return value;
  }
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
  let buf = '',
    decls: string[] = [];
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
          if (throwIf(depth === 0, new StyleDeclarationError('Unmatched closing parenthesis ) in declaration', { declaration: s }))) {
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
```

### ./src/lib/tests/style-attribute-parser.spec.ts

Referenced Tasks
- Unit-Tests Parser Valid-Parsing, !important, komplexe Werte, und Strict-Mode Fehlerfälle

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import {
  parseStyleAttribute,
  getStyleEntryAsString,
  getSTyleEntryValueAsString,
  StyleParseError,
  StyleDeclarationError,
} from '../style-attribute-parser';

describe('style-attribute-parser', () => {
  describe('parseStyleAttribute (non-strict default)', () => {
    it('parses multiple declarations including quotes and parens', () => {
      const input = `color: red; content: "a; b"; transform: translateX(calc(100% - 2rem));`;
      const out = parseStyleAttribute(input);
      expect(out).toEqual([
        ['color', 'red', undefined],
        ['content', '"a; b"', undefined],
        ['transform', 'translateX(calc(100% - 2rem))', undefined],
      ]);
    });

    it('parses !important priority', () => {
      const input = `border: 1px solid red !important; padding: 10px;`;
      const out = parseStyleAttribute(input);
      expect(out).toEqual([
        ['border', '1px solid red', 'important'],
        ['padding', '10px', undefined],
      ]);
    });

    it('skips malformed declarations by default (no throw)', () => {
      const input = `color red; valid: yes;`;
      const out = parseStyleAttribute(input);
      expect(out).toEqual([['valid', 'yes', undefined]]);
    });
  });

  describe('parseStyleAttribute (strict mode)', () => {
    it('throws on missing colon in declaration', () => {
      const input = `color red; padding: 1rem;`;
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(StyleDeclarationError);
      try {
        parseStyleAttribute(input, { strict: true });
      } catch (e: any) {
        expect(e).toBeInstanceOf(StyleDeclarationError);
        expect(e.context?.declaration).toContain('color red');
      }
    });

    it('throws on unclosed quote', () => {
      const input = `content: "abc; color: red;`;
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(StyleParseError);
    });

    it('throws on unmatched closing parenthesis', () => {
      const input = `color: red); padding: 0;`;
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(StyleParseError);
    });

    it('throws on unbalanced parentheses (missing ) )', () => {
      const input = `transform: translateX(10px; color: blue;`;
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(StyleParseError);
    });

    it('throws on unmatched ) inside declaration scanning', () => {
      const input = `transform: foo) bar: baz;`;
      expect(() => parseStyleAttribute(input, { strict: true })).toThrowError(StyleDeclarationError);
    });
  });

  describe('formatting helpers', () => {
    it('getStyleEntryAsString single and multiple', () => {
      expect(getStyleEntryAsString(['color', 'red'])).toBe('color: red');
      expect(
        getStyleEntryAsString([
          ['color', 'red'],
          ['border', '1px solid black', 'important'],
        ])
      ).toBe('color: red; border: 1px solid black !important');
    });

    it('getSTyleEntryValueAsString single and multiple', () => {
      expect(getSTyleEntryValueAsString(['color', 'red'])).toBe('red');
      expect(
        getSTyleEntryValueAsString([
          ['color', 'red'],
          ['border', '1px solid black', 'important'],
        ])
      ).toBe('red; 1px solid black');
    });
  });
});
```

## Hinweise zur Implementierung

- Default-Verhalten bleibt abwärtskompatibel (kein Throwing, “skip” von Fehlern).
- Strict-Modus (opts.strict: true) wirft aussagekräftige Fehler (StyleParseError, StyleDeclarationError) mit Kontextfeldern (index, near, input, declaration).
- Keine Änderungen in style-adjust-manager nötig, da parseStyleAttribute-Signatur nur optional erweitert wurde.

## Beispiel-Prompts zur Präzisierung

- “Aktiviere Strict-Mode standardmäßig im Build, aber nutze non-strict in Production.” (falls gewünscht)
- “Wirf auch Fehler bei leeren Property-Namen (z. B. ‘: red;’) im Strict-Mode.”
- “Ergänze Error-Codes (enum) in den Exceptions, damit Frontend-Logs leichter filterbar sind.”