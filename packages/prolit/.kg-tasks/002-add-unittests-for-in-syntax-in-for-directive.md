---
slugName: add-unittests-for-in-syntax-in-for-directive
includeFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/utils/createTest.ts
- ./src/tests/directives/for-directive.spec.ts
editFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/directives/for-in-directive.spec.ts
original_prompt: lege unittests in der for-directive für die in syntax und
---
# Prepare: Unittests für *for Directive mit "in" Syntax

Ergänze Unit-Tests für die "*for" Direktive mit der "in"-Syntax und korrigiere die Implementierung, sodass beliebige (auch mehrstellige oder destrukturierte) lokale Variablen für "in" unterstützt werden.

## Assumptions

- "*for='x in obj'":
  - Iteriert über Object.entries(obj).
  - Die lokale Variable erhält den Entry [key, value].
  - $index ist innerhalb des Schleifenrumpfs verfügbar.
- "*for='e in arr'":
  - Iteriert über Object.entries(arr), d. h. e[0] ist der Index (als String), e[1] der Wert.
- Destrukturierung sollte möglich sein, z. B. "*for='[k,v] in obj'".
- Wir fügen zunächst Tests für die einfache Form (eine lokale Variable) hinzu; der Fix in der Parser-Generierung erlaubt automatisch auch Destrukturierung.

## Tasks

- Tests: *for "in" über Objekt-Entries (Key/Value im Item abrufen)
- Tests: *for "in" über Array-Entries (Index/Wert)
- Fix: Parser/Generator für "*for ... in ..." nutzt vollständigen lokalen Variablenausdruck (nicht nur erstes Zeichen)

## Overview: File changes

- src/parser/Element2Function.ts Korrigiere die Parametergenerierung für "*for ... in ..." damit vollständige lokale Ausdrücke verwendet werden
- src/tests/directives/for-in-directive.spec.ts Neuer Test: "in"-Syntax für Objekte und Arrays inkl. $index

## Detail changes

### src/parser/Element2Function.ts

Referenced Tasks
- Fix: Parser/Generator für "*for ... in ..."

Ersetze innerhalb der Methode wrapStrucutre den Block für attr.name === '*for' in der "in"-Variante. Der bestehende Code nutzt aktuell nur das erste Zeichen des lokalen Variablennamens (match[1][0]). Das verhindert mehrere Zeichen und Destrukturierung. Ersetze die Zeile:

```typescript
wrapper.push({ start: `$$__litEnv.repeat(Object.entries(${match[3]}), ${indexBy}, (${match[1][0]}, $index) => `, end: ')' });
```

durch:

```typescript
wrapper.push({
  start: `$$__litEnv.repeat(Object.entries(${match[3]}), ${indexBy}, (${match[1]}, $index) => `,
  end: ')'
});
```

Kontext (ausschnittweise, nur relevanter Teil gezeigt):

```typescript
if (attr.name === '*for') {
  // <localName> in <array> or <localname> of <array>
  const match = /^(.*?)\s+(in|of)\s+(.*)(;(.*?))?$/.exec(attr.value || '');
  if (!match) {
    throw new Error(`Invalid *for attribute value: ${attr.value}`);
  }

  let indexBy = "null";
  if (match[5]) {
    indexBy = match[1] + " => " + match[5].trim();
  }

  if (match[2] === 'of') {
    wrapper.push({ start: `$$__litEnv.repeat(${match[3]}, ${indexBy}, (${match[1]}, $index) => `, end: ')' });
  } else if (match[2] === 'in') {
    // FIX: use the full local expression (supports multi-char or destructuring)
    wrapper.push({
      start: `$$__litEnv.repeat(Object.entries(${match[3]}), ${indexBy}, (${match[1]}, $index) => `,
      end: ')'
    });
  }
  continue;
}
```

Hinweis: Dies macht die "in"-Variante robust gegen längere Bezeichner sowie Destrukturierung wie "[k,v]".

### src/tests/directives/for-in-directive.spec.ts

Referenced Tasks
- Tests: *for "in" über Objekt-Entries und Arrays inkl. $index

Neue Datei mit folgendem Inhalt:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

function getLiTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('ul > li')).map((li) => (li.textContent ?? '').trim());
}

describe('*for directive with "in" syntax', () => {
  it('iterates Object entries: local receives [key, value]', () => {
    const { e, render } = createTest(
      `<ul><li *for="entry in obj">{{ entry[0] }}={{ entry[1] }}</li></ul>`,
      { obj: { a: 1, b: 2 } }
    );

    render();
    expect(getLiTexts(e)).toEqual(['a=1', 'b=2']);
  });

  it('iterates Array entries: local receives [index, value]', () => {
    const { e, render } = createTest(
      `<ul><li *for="pair in arr">{{ pair[0] }}-{{ pair[1] }}</li></ul>`,
      { arr: ['x', 'y'] }
    );

    render();
    expect(getLiTexts(e)).toEqual(['0-x', '1-y']);
  });

  it('exposes $index alongside the entry', () => {
    const { e, render } = createTest(
      `<ul><li *for="kv in obj">{{$index}}:{{ kv[0] }}={{ kv[1] }}</li></ul>`,
      { obj: { foo: 'bar', baz: 'qux' } }
    );

    render();
    expect(getLiTexts(e)).toEqual(['0:foo=bar', '1:baz=qux']);
  });
});
```

## Example prompts to improve the original request

- Sollen wir Destrukturierung offiziell dokumentieren und eigene Tests hinzufügen, z. B. "*for='[k,v] in obj'"?
- Sollen wir für "in" auch eine optionale Key-Funktion analog zur "; id ..." Syntax unterstützen? Wenn ja, welches Format?