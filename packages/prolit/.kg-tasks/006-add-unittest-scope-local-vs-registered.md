---
slugName: add-unittest-scope-local-vs-registered
includeFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/utils/createTest.ts
- ./src/tests/scope/scope-local-vs-registered.spec.ts
editFiles:
- ./src/tests/scope/scope-local-vs-registered.spec.ts
original_prompt: 'Erstelle einen unittest, der klar macht, wann eine varable lokal
  bleibt und wann Sie im skope registriert und von ausßen zugänglich ist: immer mit
  .name setzen. z.B. wenn per click eine Variable geändert werden soll ohne nutzung
  von keine abbildung auf den großen scope.'
---
# Prepare: Unittest für Scope-Variablen – lokal vs. im Scope registriert

Schreibe Unittests, die eindeutig zeigen:
- Wann Variablen nur lokal sind (z. B. via let/const in *do oder im Event-Handler).
- Wann Variablen im Template-Scope registriert und von außen zugreifbar sind (durch „nackte“ Zuweisung ohne let/const – via with($scope) landet das auf dem Scope).

Beispiele enthalten: *do, @click und *for.

## Assumptions

- Der generierte Renderer führt die Vorlage innerhalb von with($scope) aus.
- Zuweisungen ohne let/const (z. B. x = 1) schreiben in den Template-Scope (sichtbar als sc.x).
- Deklarationen mit let/const/var in IIFEs (*do) oder Event-Handlern bleiben lokal und sind nicht im Scope sichtbar.
- Schleifenvariable in *for (z. B. item) ist nur lokal in der Schleife vorhanden, nicht im allgemeinen Scope.
- Um Referenzfehler beim Zugriff auf nicht definierte Namen zu vermeiden, nutzen die Tests typeof checks in Interpolationen.

## Missing Information

- Sollen wir in der Doku explizit festhalten, dass nackte Zuweisungen Variablen im Scope anlegen, während let/const lokal bleibt? Falls ja, bitte bestätigen; aktuell testen wir dieses Verhalten nur.

## Tasks

- unittest-do-scope Test: *do – let/const lokal, nackte Zuweisung registriert im Scope
- unittest-event-scope Test: @click – let bleibt lokal, nackte Zuweisung ändert Scope
- unittest-for-scope Test: *for – Schleifenvariable bleibt lokal und ist außerhalb nicht verfügbar

## Overview: File changes

- src/tests/scope/scope-local-vs-registered.spec.ts Neue Tests für lokales Verhalten vs. Scope-Registrierung

## Detail changes

### src/tests/scope/scope-local-vs-registered.spec.ts

Referenced Tasks
- unittest-do-scope
- unittest-event-scope
- unittest-for-scope

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('Scope-Variablen: lokal vs. im Scope registriert', () => {
  it('*do: let/const bleibt lokal, nackte Zuweisung ist im Scope sichtbar', () => {
    const { e, sc, render } = createTest(
      `<div>
        <div *do="let localA = 1; A = 2">
          <span id="in">{{ localA }}-{{ A }}</span>
        </div>
        <span id="outA">{{ typeof A !== 'undefined' ? A : 'undef' }}</span>
        <span id="outLocal">{{ typeof localA !== 'undefined' ? localA : 'undef' }}</span>
      </div>`,
      {}
    );

    render();

    expect(e.querySelector('#in')!.textContent?.trim()).toBe('1-2');
    expect(e.querySelector('#outA')!.textContent?.trim()).toBe('2');
    expect(e.querySelector('#outLocal')!.textContent?.trim()).toBe('undef');

    expect((sc as any).A).toBe(2);
    expect('localA' in sc).toBe(false);
  });

  it('@click: let erzeugt lokale Variable, nackte Zuweisung schreibt in Scope', () => {
    const { e, sc, render } = createTest(
      `<div>
        <button id="btnLocal" @click="let clickedLocal = true">Local</button>
        <button id="btnScope" @click="counter = (counter || 0) + 1">Scope</button>

        <span id="vLocal">{{ typeof clickedLocal !== 'undefined' ? clickedLocal : 'undef' }}</span>
        <span id="vScope">{{ typeof counter !== 'undefined' ? counter : 'undef' }}</span>
      </div>`,
      {}
    );

    render();

    const btnLocal = e.querySelector('#btnLocal') as HTMLButtonElement;
    const btnScope = e.querySelector('#btnScope') as HTMLButtonElement;

    btnLocal.click();
    render();
    expect(e.querySelector('#vLocal')!.textContent?.trim()).toBe('undef');
    expect('clickedLocal' in sc).toBe(false);

    btnScope.click();
    render();
    expect(e.querySelector('#vScope')!.textContent?.trim()).toBe('1');
    expect((sc as any).counter).toBe(1);
  });

  it('*for: Schleifenvariable bleibt lokal und ist außerhalb nicht verfügbar', () => {
    const { e, sc, render } = createTest(
      `<div>
        <ul><li *for="t of todos">{{ t }}</li></ul>
        <span id="outside">{{ typeof t !== 'undefined' ? t : 'undef' }}</span>
      </div>`,
      { todos: ['a', 'b'] }
    );

    render();

    const texts = Array.from(e.querySelectorAll('ul > li')).map((li) => (li.textContent ?? '').trim());
    expect(texts).toEqual(['a', 'b']);
    expect(e.querySelector('#outside')!.textContent?.trim()).toBe('undef');
    expect('t' in sc).toBe(false);
  });
});
```

## Example prompts to improve the original request

- Sollen wir dieses Verhalten in der Doku explizit beschreiben (Zuweisung ohne let/const registriert im Scope, let/const bleibt lokal)?
- Sollen wir zusätzlich ein Beispiel zeigen, wie man absichtlich in den Scope schreibt (z. B. via $scope.name = ...) vs. lokal hält (let name = ...)?