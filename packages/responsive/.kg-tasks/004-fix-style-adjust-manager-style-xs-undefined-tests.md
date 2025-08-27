---
slugName: fix-style-adjust-manager-style-xs-undefined-tests
includeFiles:
- ./src/lib/style-adjust-manager.ts
- ./src/lib/style-attribute-parser.ts
- ./src/lib/tests/style-adjust-manager.spec.ts
- ./src/lib/tests/style-attribute-parser.spec.ts
editFiles:
- ./src/lib/style-adjust-manager.ts
- ./src/lib/style-attribute-parser.ts
- ./src/lib/tests/style-adjust-manager.spec.ts
- ./src/lib/tests/style-attribute-parser.spec.ts
original_prompt: repariere den style-adjust-manager wird style-xs immer mit undefined
  undefined angenommen und schreibe Unittests dafür.
---
# Prepare Fix: style-adjust-manager setzt style-xs als "undefined undefined" + Unit-Tests

Kurz: style-xs wird fälschlich als "undefined: undefined" gesetzt, wenn es keine Originalwerte für beobachtete Properties gibt. Zusätzlich bleiben responsive Styles erhalten, obwohl sie im aktuellen Breakpoint nicht mehr gelten. Wir beheben das und ergänzen Unit-Tests.

## Assumptions

- breakpoints ist in aufsteigender Reihenfolge definiert (xs → sm → md → ...), sodass Iteration in dieser Reihenfolge erfolgt.
- style-xs soll nur gesetzt werden, wenn es für beobachtete Properties auch originale Werte gibt.
- Beobachtete Properties sind die, die in den style-* Attributen vorkommen.
- Wenn für den aktuellen Breakpoint eine beobachtete Property keinen Wert bekommt, soll diese Property aus dem inline style entfernt werden (Reset auf ursprünglichen Zustand).
- getStyleEntryAsString soll leere Arrays korrekt als leeren String serialisieren (statt "undefined: undefined").

Beispiele, die den Auftrag präzisieren würden:
- "Wenn originaler style keine passende Property hat (z. B. border-color), soll style-xs leer bleiben und die Property bei kleineren Breakpoints entfernt werden, falls sie zuvor gesetzt war."
- "Bitte mit Tests abdecken: Umschalten breit→schmal entfernt Properties, die nur in großen Breakpoints gesetzt waren."

## Tasks

- Fix: style-attribute-parser.getStyleEntryAsString korrekt für Arrays und leere Arrays
- Fix: style-adjust-manager setzt style-xs nur bei vorhandenen Originalwerten
- Fix: style-adjust-manager entfernt nicht passende beobachtete Properties bei Breakpoint-Wechsel
- Tests: Neu style-adjust-manager.spec.ts mit Breakpoint-Mocks und Szenarien (Baseline fehlt, Baseline vorhanden, Kaskaden-Präzedenz)

## Overview: File changes

- ./src/lib/style-attribute-parser.ts Korrektur Array-Erkennung in getStyleEntryAsString; robust bei leeren Arrays
- ./src/lib/style-adjust-manager.ts style-xs nur setzen, wenn baseline > 0; Properties, die nicht matchen, entfernen
- ./src/lib/tests/style-adjust-manager.spec.ts Neue Unit-Tests für oben genannte Fälle
- ./src/lib/tests/style-attribute-parser.spec.ts Test-Anpassung: Zusatztest für leeres Array-Formatting

## Detail changes

### ./src/lib/style-attribute-parser.ts

Referenced Tasks
- Fix: style-attribute-parser.getStyleEntryAsString korrekt für Arrays und leere Arrays

Replace

```typescript
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

export function getSTyleEntryValueAsString(entry: StyleEntry): string {
  return entry[1] + (entry[2] ? ' !' + entry[2] : '');
}
```

by

```typescript
export function getStyleEntryAsString(entry: StyleEntry | StyleEntry[]): string {
  // Properly detect array-of-entries and handle empty arrays gracefully
  if (Array.isArray(entry)) {
    if (entry.length === 0) return '';
    return (entry as StyleEntry[])
      .map((e) => getStyleEntryAsString(e))
      .filter((s) => !!s)
      .join('; ');
  } else {
    const [prop, value, priority] = entry as StyleEntry;
    if (!prop) return ''; // prevent "undefined: undefined"
    return `${prop}: ${value}${priority ? ' !' + priority : ''}`;
  }
}

export function getSTyleEntryValueAsString(entry: StyleEntry): string {
  const [, value, priority] = entry;
  return `${value}${priority ? ' !' + priority : ''}`;
}
```

### ./src/lib/style-adjust-manager.ts

Referenced Tasks
- Fix: style-adjust-manager setzt style-xs nur bei vorhandenen Originalwerten
- Fix: style-adjust-manager entfernt nicht passende beobachtete Properties bei Breakpoint-Wechsel

Replace the block that unconditionally writes style-xs and only sets properties without cleanup:

```typescript
  if (!styleBpMap['xs']) {
    // First update - create the original styles of all observed styles
    const origStyles = parseStyleAttribute(element.getAttribute('style') || '');
    // Filter only the observed styles
    const filteredOrigStyles = origStyles.filter((entry) => observedStyles.has(entry[0]));
    styleBpMap['xs'] = filteredOrigStyles;
    element.setAttribute('style-xs', getStyleEntryAsString(filteredOrigStyles));
  }

  const styleResult = new Map<string, string>();
  for(const bp in breakpoints) {
    if (curWidth >= breakpoints[bp].minWidth) {
      if(styleBpMap[bp]) {
        // Apply styles for this breakpoint
        const styles = styleBpMap[bp];
        for (const entry of styles) {
          styleResult.set(entry[0], getSTyleEntryValueAsString(entry));
        }

      }
    }
  }

  for(const [prop, value] of styleResult) {
    element.style.setProperty(prop, value);
  }
```

by

```typescript
  if (!styleBpMap['xs']) {
    // First update - create the original styles of all observed styles
    const origStyles = parseStyleAttribute(element.getAttribute('style') || '');
    // Filter only the observed styles
    const filteredOrigStyles = origStyles.filter((entry) => observedStyles.has(entry[0]));

    // Only set style-xs and store baseline if there are actual original values
    if (filteredOrigStyles.length > 0) {
      styleBpMap['xs'] = filteredOrigStyles;
      const baseline = getStyleEntryAsString(filteredOrigStyles);
      if (baseline) {
        element.setAttribute('style-xs', baseline);
      }
    }
  }

  const styleResult = new Map<string, string>();
  for (const bp in breakpoints) {
    if (curWidth >= breakpoints[bp].minWidth) {
      const styles = styleBpMap[bp];
      if (styles) {
        for (const entry of styles) {
          styleResult.set(entry[0], getSTyleEntryValueAsString(entry));
        }
      }
    }
  }

  // Apply: set matching values, remove non-matching observed properties
  for (const prop of observedStyles) {
    const value = styleResult.get(prop);
    if (value === undefined) {
      element.style.removeProperty(prop);
    } else {
      element.style.setProperty(prop, value);
    }
  }
```

...original content...

### ./src/lib/tests/style-adjust-manager.spec.ts

Referenced Tasks
- Tests: Neu style-adjust-manager.spec.ts mit Breakpoint-Mocks und Szenarien (Baseline fehlt, Baseline vorhanden, Kaskaden-Präzedenz)

Create file with:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@trunkjs/browser-utils', () => {
  return {
    breakpoints: {
      xs: { minWidth: 0 },
      sm: { minWidth: 576 },
      md: { minWidth: 768 },
      lg: { minWidth: 992 },
      xl: { minWidth: 1200 },
    },
  };
});

import { adjustElementStyle } from '../style-adjust-manager';

describe('style-adjust-manager', () => {
  it('does not create style-xs when no original values for observed properties exist', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'border: 5px dotted blue; padding: 10px');
    el.setAttribute('style-xl', 'border-color: red');

    // below xl
    adjustElementStyle(el, 500);
    expect(el.getAttribute('style-xs')).toBeNull();
    expect(el.style.getPropertyValue('border-color')).toBe('');

    // at/above xl → apply responsive style
    adjustElementStyle(el, 1300);
    expect(el.style.getPropertyValue('border-color')).toBe('red');

    // back below xl → responsive property removed
    adjustElementStyle(el, 500);
    expect(el.style.getPropertyValue('border-color')).toBe('');
  });

  it('stores baseline in style-xs and toggles back to the original value', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'color: black; margin: 0');
    el.setAttribute('style-md', 'color: green');

    // below md → baseline applied
    adjustElementStyle(el, 500);
    expect(el.getAttribute('style-xs')).toBe('color: black');
    expect(el.style.getPropertyValue('color')).toBe('black');

    // at/above md → responsive value wins
    adjustElementStyle(el, 900);
    expect(el.style.getPropertyValue('color')).toBe('green');

    // below md again → baseline restored
    adjustElementStyle(el, 500);
    expect(el.style.getPropertyValue('color')).toBe('black');
  });

  it('applies last matching breakpoint value across multiple style-* attributes', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'color: black');
    el.setAttribute('style-sm', 'color: blue');
    el.setAttribute('style-md', 'color: green');
    el.setAttribute('style-xl', 'color: red');

    adjustElementStyle(el, 400);  // < sm
    expect(el.style.getPropertyValue('color')).toBe('black');

    adjustElementStyle(el, 600);  // >= sm
    expect(el.style.getPropertyValue('color')).toBe('blue');

    adjustElementStyle(el, 800);  // >= md
    expect(el.style.getPropertyValue('color')).toBe('green');

    adjustElementStyle(el, 1300); // >= xl
    expect(el.style.getPropertyValue('color')).toBe('red');
  });
});
```

### ./src/lib/tests/style-attribute-parser.spec.ts

Referenced Tasks
- Tests: Zusatztest für leeres Array-Verhalten in getStyleEntryAsString

Insert after getStyleEntryAsString tests:

```typescript
    it('formats empty array as empty string', () => {
      // @ts-expect-error test non-standard input guarding
      expect(getStyleEntryAsString([])).toBe('');
    });
```

And remove the invalid test that passes an array to getSTyleEntryValueAsString (function is defined for single StyleEntry only). Replace the entire block:

Replace

```typescript
  describe('getSTyleEntryValueAsString', () => {
    it('returns value for single entry', () => {
      const entry: StyleEntry = ['color', 'red'];
      expect(getSTyleEntryValueAsString(entry)).toBe('red');
    });

    it('joins values for arrays of entries', () => {
      const entries: StyleEntry[] = [
        ['color', 'red'],
        ['margin', '1px', 'important'],
      ];
      expect(getSTyleEntryValueAsString(entries)).toBe('red; 1px');
    });
  });
```

by

```typescript
  describe('getSTyleEntryValueAsString', () => {
    it('returns value for single entry', () => {
      const entry: StyleEntry = ['color', 'red'];
      expect(getSTyleEntryValueAsString(entry)).toBe('red');
    });

    it('returns value with priority marker when important', () => {
      const entry: StyleEntry = ['margin', '1px', 'important'];
      expect(getSTyleEntryValueAsString(entry)).toBe('1px !important');
    });
  });
```

## Notes

- Diese Änderungen verhindern "undefined: undefined" in style-xs:
  - getStyleEntryAsString ist robust für leere Arrays.
  - style-xs wird nur gesetzt, wenn baseline tatsächlich Inhalte hat.
- Zusätzlich werden beobachtete Properties entfernt, wenn sie im aktuellen Breakpoint keinen Wert erhalten, sodass beim Wechsel auf kleinere Breakpoints keine veralteten Styles stehenbleiben.

## Beispiel-Verbesserungen für die ursprüngliche Anfrage

- "Bitte sorge dafür, dass Properties, die nur in style-* Breakpoints vorkommen, bei kleineren Breakpoints wieder entfernt werden."
- "Füge Unit-Tests hinzu, die sowohl Fälle mit existierenden Originalwerten (Baseline) als auch ohne (kein style-xs) abdecken."
- "Berücksichtige die korrekte Serialisierung in getStyleEntryAsString für leere Arrays, damit niemals 'undefined: undefined' entsteht."