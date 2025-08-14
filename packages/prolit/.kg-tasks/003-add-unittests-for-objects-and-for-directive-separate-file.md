---
slugName: add-unittests-for-objects-and-for-directive-separate-file
includeFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/utils/createTest.ts
- ./src/tests/directives/for-directive-array.spec.ts
editFiles:
- ./src/tests/directives/for-directive-object.spec.ts
original_prompt: lege unittests für objecte und for direktive an in separater datei
---
# Prepare: Unittests für Objekte und *for Direktive (separate Datei)

Lege zusätzliche Unit-Tests für Objekt-Iteration mit der "*for"-Direktive in einer separaten Datei an. Fokus: "*for='k in obj'" mit Zugriff auf Werte via obj[k], $index, sowie DOM-Updates nach Scope-Mutationen.

## Assumptions

- Aktuelle Implementierung für "*for ... in ..." nutzt Object.keys(obj) und liefert den Schlüssel (k) als lokale Variable.
- Wertezugriff in der Vorlage erfolgt über obj[k].
- $index ist im Schleifenrumpf als $index verfügbar.
- Ordnung der Keys ist die Standard-Enumerationsreihenfolge von Object.keys für nicht-numerische Schlüssel.

## Tasks

- for-object-basic Iteration über Objekt-Keys und Rendern von key=value
- for-object-index $index in Objekt-Schleife sichtbar
- for-object-update DOM-Updates bei Property-Änderungen (Hinzufügen/Löschen)

## Overview: File changes

- src/tests/directives/for-directive-object.spec.ts Neue Tests für "*for ... in ..." mit Objekten

## Detail changes

### src/tests/directives/for-directive-object.spec.ts

Referenced Tasks
- for-object-basic Rendere key=value Paare aus einem Objekt
- for-object-index $index in Objekt-Schleife
- for-object-update Änderungen an obj reflektieren sich nach render()

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

function getLiTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('ul > li')).map((li) => (li.textContent ?? '').trim());
}

describe('*for directive with object (in)', () => {
  it('iterates object keys and renders key=value', () => {
    const { e, render } = createTest(
      `<ul><li *for="k in obj">{{ k }}={{ obj[k] }}</li></ul>`,
      { obj: { a: 1, b: 2 } }
    );

    render();
    expect(getLiTexts(e)).toEqual(['a=1', 'b=2']);
  });

  it('exposes $index for object iteration', () => {
    const { e, render } = createTest(
      `<ul><li *for="key in obj">{{$index}}:{{ key }}={{ obj[key] }}</li></ul>`,
      { obj: { x: 'X', y: 'Y' } }
    );

    render();
    expect(getLiTexts(e)).toEqual(['0:x=X', '1:y=Y']);
  });

  it('updates DOM after adding/removing properties and re-rendering', () => {
    const { sc, e, render } = createTest(
      `<ul><li *for="k in obj">{{ k }}={{ obj[k] }}</li></ul>`,
      { obj: { a: 'A' as string, b: undefined as any } }
    );

    render();
    expect(getLiTexts(e)).toEqual(['a=A', 'b=']); // b is present with undefined value

    // Add new property
    sc.obj.c = 'C';
    render();
    expect(getLiTexts(e)).toEqual(['a=A', 'b=', 'c=C']);

    // Remove a property
    delete sc.obj.a;
    render();
    expect(getLiTexts(e)).toEqual(['b=', 'c=C']);
  });
});
```

## Example prompts to improve the original request

- Sollen wir zusätzlich einen Test für die Nutzung von "; keyFn" bei Objekten ergänzen, z. B. "*for='k in obj; k'"?
- Soll die Objekt-Iteration künftig Object.entries(obj) liefern (z. B. zur Unterstützung von Destrukturierung), damit "*for='[k,v] in obj'" möglich wird?