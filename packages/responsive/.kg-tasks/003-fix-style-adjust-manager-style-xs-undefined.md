---
slugName: fix-style-adjust-manager-style-xs-undefined
includeFiles:
- ./src/lib/style-adjust-manager.ts
- ./src/lib/style-attribute-parser.ts
- ./src/lib/tests/style-attribute-parser.spec.ts
- ./src/lib/tests/class-adjust-manager.spec.ts
- ./src/lib/tests/style-adjust-manager.spec.ts
editFiles:
- ./src/lib/style-adjust-manager.ts
- ./src/lib/style-attribute-parser.ts
- ./src/lib/tests/style-adjust-manager.spec.ts
original_prompt: repariere den style-adjust-manager wird style-xs immer mit undefined
  undefined angenommen und schreibe Unittests dafür.
---
# Prepare Fix: style-adjust-manager setzt style-xs zu "undefined undefined" + Unittests

Behebt, dass style-xs bei fehlenden Basis-Styles als "undefined: undefined" geschrieben wird. Ergänzt robuste Formatfunktionen und erstellt Tests für adjustElementStyle.

## Annahmen

- Verhalten: style-xs soll nur gesetzt werden, wenn im ursprünglichen style-Attribut mindestens eine der von style-* beobachteten CSS-Eigenschaften vorhanden ist.
- Leere Style-Listen dürfen niemals als "undefined: undefined" serialisiert werden. Stattdessen soll gar nichts (leerer String) zurückgegeben bzw. kein style-xs-Attribut gesetzt werden.
- Breakpoints stehen aufsteigend in breakpoints und haben minWidth.

## Aufgaben

- Bugfix style-adjust-manager: style-xs nie als "undefined: undefined" schreiben
- Robustheit Parser: getStyleEntryAsString / getSTyleEntryValueAsString leere Arrays → '' zurückgeben
- Unittests style-adjust-manager: Basisfälle und Regressionstest gegen "undefined" im style-xs

## Überblick: Dateiänderungen

- ./src/lib/style-attribute-parser.ts Robustere Formatierung für leere Arrays in getStyleEntryAsString und getSTyleEntryValueAsString
- ./src/lib/style-adjust-manager.ts style-xs nur setzen, wenn gefilterte Original-Styles vorhanden sind
- ./src/lib/tests/style-adjust-manager.spec.ts Neue Tests für adjustElementStyle inkl. Mock der Breakpoints

## Detailänderungen

### ./src/lib/style-attribute-parser.ts

Referenzierte Aufgaben
- Robustheit Parser

Ersetze die Implementierungen der Formatfunktionen durch robustere Versionen, die leere Arrays korrekt behandeln.

Ersetze

```ts
export function getStyleEntryAsString(entry: StyleEntry | StyleEntry[]): string {
  if (Array.isArray(entry[0])) {
    return (entry as StyleEntry[])
      .map((e) => getStyleEntryAsString(e))
      .filter((s) => s)
      .join('; ');
  } else {
    const [prop, value, priority] = entry as StyleEntry;
    return `${prop: } ${value}${priority ? ' !' + priority : ''}`;
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
```

durch

```ts
export function getStyleEntryAsString(entry: StyleEntry | StyleEntry[]): string {
  // Handle arrays of entries and empty arrays safely
  if (Array.isArray(entry)) {
    const arr = entry as unknown as any[];
    if (arr.length === 0) return '';
    // If first item is itself an array => StyleEntry[]
    if (Array.isArray(arr[0])) {
      return (entry as StyleEntry[])
        .map((e) => getStyleEntryAsString(e))
        .filter((s) => s)
        .join('; ');
    }
  }
  // Treat as single StyleEntry
  const [prop, value, priority] = entry as StyleEntry;
  if (!prop) return '';
  return `${prop}: ${value}${priority ? ' !' + priority : ''}`;
}

export function getSTyleEntryValueAsString(entry: StyleEntry | StyleEntry[]): string {
  if (Array.isArray(entry)) {
    const arr = entry as unknown as any[];
    if (arr.length === 0) return '';
    if (Array.isArray(arr[0])) {
      return (entry as StyleEntry[])
        .map((e) => getSTyleEntryValueAsString(e))
        .filter((s) => s)
        .join('; ');
    }
  }
  const [, value] = entry as StyleEntry;
  return value ?? '';
}
```

### ./src/lib/style-adjust-manager.ts

Referenzierte Aufgaben
- Bugfix style-adjust-manager

Passe die Initialisierung von style-xs an, so dass es nur gesetzt wird, wenn gefilterte Original-Styles vorhanden sind. Vermeide Aufruf von getStyleEntryAsString mit leerem Array.

Ersetze den Block

```ts
  if (!styleBpMap['xs']) {
    // First update - create the original styles of all observed styles
    const origStyles = parseStyleAttribute(element.getAttribute('style') || '');
    // Filter only the observed styles
    const filteredOrigStyles = origStyles.filter((entry) => observedStyles.has(entry[0]));
    styleBpMap['xs'] = filteredOrigStyles;
    element.setAttribute('style-xs', getStyleEntryAsString(filteredOrigStyles));
  }
```

durch

```ts
  if (!styleBpMap['xs']) {
    // First update - create the original styles of all observed styles
    const origStyles = parseStyleAttribute(element.getAttribute('style') || '');
    // Filter only the observed styles that are controlled via responsive attributes
    const filteredOrigStyles = origStyles.filter((entry) => observedStyles.has(entry[0]));
    styleBpMap['xs'] = filteredOrigStyles;
    // Only set style-xs if there is at least one relevant original declaration
    if (filteredOrigStyles.length > 0) {
      element.setAttribute('style-xs', getStyleEntryAsString(filteredOrigStyles));
    }
  }
```

Optional: Belasse den Rest unverändert; das Auftragen der Styles bleibt wie bisher kumulativ je Breakpoint.

### ./src/lib/tests/style-adjust-manager.spec.ts

Referenzierte Aufgaben
- Unittests style-adjust-manager

Neue Testdatei erstellen.

Inhalt:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adjustElementStyle } from '../style-adjust-manager';

vi.mock('@trunkjs/browser-utils', () => {
  return {
    breakpoints: {
      xs: { minWidth: 0 },
      sm: { minWidth: 576 },
      md: { minWidth: 768 },
      lg: { minWidth: 992 },
      xl: { minWidth: 1200 },
      xxl: { minWidth: 1400 },
    },
  };
});

describe('style-adjust-manager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does not set style-xs if no relevant original styles exist (regression for "undefined: undefined")', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'border: 1px solid green; padding: 4px;');
    el.setAttribute('style-md', 'color: blue;');

    // width below md => no md styles applied; initialization path runs
    adjustElementStyle(el, 500);

    // style-xs must not be created with "undefined: undefined"
    expect(el.getAttribute('style-xs')).toBeNull();
    // original inline style remains untouched for unrelated properties
    expect(el.getAttribute('style')).toContain('border: 1px solid green');
  });

  it('creates style-xs from relevant original styles and never contains "undefined"', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'color: black; border: 1px solid green; padding: 10px;');
    el.setAttribute('style-md', 'color: blue;');
    el.setAttribute('style-lg', 'border-color: red;');

    // Initialize at a small width
    adjustElementStyle(el, 400);

    const sxs = el.getAttribute('style-xs');
    expect(sxs).toBeTruthy();
    expect(sxs).toBe('color: black');
    expect(sxs?.toLowerCase()).not.toContain('undefined');

    // At small width, baseline color applies
    expect(el.style.color).toBe('black');

    // At md (>=768): color overridden to blue; border-color not yet applied
    adjustElementStyle(el, 800);
    expect(el.style.color).toBe('blue');

    // At lg (>=992): border-color red applied
    adjustElementStyle(el, 1200);
    expect(el.style.borderColor).toBe('red');
  });

  it('applies cumulative styles for all breakpoints whose minWidth <= curWidth', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'margin: 0;');
    el.setAttribute('style-sm', 'padding: 4px;');
    el.setAttribute('style-md', 'padding: 8px; color: green;');

    // <576 => only original styles
    adjustElementStyle(el, 500);
    expect(el.style.padding).toBe(''); // not applied yet
    // >=576 => sm applies
    adjustElementStyle(el, 600);
    expect(el.style.padding).toBe('4px');
    // >=768 => md overrides padding and adds color
    adjustElementStyle(el, 900);
    expect(el.style.padding).toBe('8px');
    expect(el.style.color).toBe('green');
  });
});
```

## Verbesserte Prompt-Beispiele

- Bitte präzisieren: Soll style-xs nur gesetzt werden, wenn gefilterte Original-Styles existieren, oder soll ein leeres style-xs-Attribut geschrieben werden?
- Welche Breakpoints sollen in Tests verwendet werden (Standard-Bootstrap-Werte ausreichend)?

