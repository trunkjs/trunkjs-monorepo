---
slugName: add-unittests-for-events-attributes-properties-boolean-and-if
includeFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/utils/createTest.ts
- ./vite.config.ts
editFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/directives/event-directive.spec.ts
- ./src/tests/directives/attribute-binding.spec.ts
- ./src/tests/directives/property-binding.spec.ts
- ./src/tests/directives/boolean-attribute.spec.ts
- ./src/tests/directives/if-directive.spec.ts
original_prompt: schreibe unittests für @event und attribute und propertys sowie boolean
  attribute sowie für if
---
# Prepare: Unittests für @event, Attribute, Property-Binding, Boolean-Attribute und *if

Schreibe Unit-Tests für:
- @event: Inline-Eventhandler
- Attribute: Interpolation in normalen Attributen
- Property-Binding: .prop
- Boolean-Attribute: ?attr
- *if: bedingtes Rendern

Zusätzlich: Fix für ein Bug im Boolean-Attribute-Generator.

## Assumptions

- Event-Handler laufen im Scope der Vorlage. Für DOM-Updates im Test wird nach Events explizit erneut render() aufgerufen.
- Attribute-Interpolation funktioniert innerhalb von Anführungszeichen (z. B. title="Hallo {{ name }}").
- Property-Binding setzt direkt die Eigenschaft (nicht das Attribut).
- Boolean-Attribute werden über lit’s ?attr=${expr} gesteuert. Der Test prüft Präsenz/Abwesenheit des Attributs.
- *if nutzt $$__litEnv.when(condition, ()=>..., ()=>html``) und rendert bei false nichts.

## Tasks

- event-tests Unit-Tests für @event: klickt Button, ändert Scope, erneutes Render prüft Text
- attribute-tests Unit-Tests für Attribut-Interpolation (title)
- property-tests Unit-Tests für .prop (z. B. input.value)
- boolean-attr-tests Unit-Tests für ?disabled toggling
- if-tests Unit-Tests für *if (sichtbar/unsichtbar)
- fix-boolean-attr Entferne fehlerhaftes Anführungszeichen im Generator für Boolean-Attribute

## Overview: File changes

- src/parser/Element2Function.ts Fix für Boolean-Attribute-Template-Ausgabe (Quote entfernen)
- src/tests/directives/event-directive.spec.ts Neue Tests für @event
- src/tests/directives/attribute-binding.spec.ts Neue Tests für Attribut-Interpolation
- src/tests/directives/property-binding.spec.ts Neue Tests für Property-Binding (.prop)
- src/tests/directives/boolean-attribute.spec.ts Neue Tests für Boolean-Attribute (?attr)
- src/tests/directives/if-directive.spec.ts Neue Tests für *if

## Detail changes

### src/parser/Element2Function.ts

Referenced Tasks
- fix-boolean-attr Entferne fehlerhaftes Anführungszeichen im Boolean-Attribute-Generator

Replace

```typescript
if (attr.name.startsWith('?')) {
  ret += ` ${attr.name}=\${${attr.value}}\"`;
  continue;
}
```

by

```typescript
if (attr.name.startsWith('?')) {
  // Boolean attribute binding (lit): ?attr=${expr}
  ret += ` ${attr.name}=\${${attr.value}}`;
  continue;
}
```

…original content…

### src/tests/directives/event-directive.spec.ts

Referenced Tasks
- event-tests Unit-Tests für @event

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('@event directive', () => {
  it('handles click event and updates scope', () => {
    const { e, sc, render } = createTest(
      `<div><button @click="count++">Count: {{ count }}</button></div>`,
      { count: 0 }
    );

    render();
    const btn = e.querySelector('button')!;
    expect(btn.textContent?.trim()).toBe('Count: 0');

    btn.click(); // invokes inline handler
    render();    // re-render to reflect updated scope

    expect(btn.textContent?.trim()).toBe('Count: 1');
  });

  it('supports multiple statements in handler', () => {
    const { e, render } = createTest(
      `<div><button @click="a++; b=a*2">A: {{ a }}, B: {{ b }}</button></div>`,
      { a: 1, b: 0 }
    );

    render();
    const btn = e.querySelector('button')!;
    expect(btn.textContent?.trim()).toBe('A: 1, B: 0');

    btn.click();
    render();

    expect(btn.textContent?.trim()).toBe('A: 2, B: 4');
  });
});
```

### src/tests/directives/attribute-binding.spec.ts

Referenced Tasks
- attribute-tests Attribut-Interpolation

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('attribute interpolation', () => {
  it('renders quoted attribute with interpolation', () => {
    const { e, render } = createTest(
      `<div title="Hello, {{ name }}!"></div>`,
      { name: 'Alice' }
    );

    render();
    const div = e.querySelector('div')!;
    expect(div.getAttribute('title')).toBe('Hello, Alice!');
  });

  it('updates attribute when scope changes after re-render', () => {
    const { e, sc, render } = createTest(
      `<div title="User: {{ name }}"></div>`,
      { name: 'Bob' }
    );

    render();
    const div = e.querySelector('div')!;
    expect(div.getAttribute('title')).toBe('User: Bob');

    sc.name = 'Carol';
    render();
    expect(div.getAttribute('title')).toBe('User: Carol');
  });
});
```

### src/tests/directives/property-binding.spec.ts

Referenced Tasks
- property-tests Property-Binding (.prop)

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('property binding (.prop)', () => {
  it('sets element property (not attribute)', () => {
    const { e, render } = createTest(
      `<div><input .value="name"></div>`,
      { name: 'Alice' }
    );

    render();
    const input = e.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Alice');
    // attribute should not necessarily be present or match
    expect(input.getAttribute('value')).not.toBe('Alice');
  });

  it('updates property on re-render when scope changes', () => {
    const { e, sc, render } = createTest(
      `<div><input .value="name"></div>`,
      { name: 'First' }
    );

    render();
    const input = e.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('First');

    sc.name = 'Second';
    render();
    expect(input.value).toBe('Second');
  });
});
```

### src/tests/directives/boolean-attribute.spec.ts

Referenced Tasks
- boolean-attr-tests Boolean-Attribute (?attr)

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('boolean attribute (?attr)', () => {
  it('toggles presence of attribute', () => {
    const { e, render } = createTest(
      `<div><button ?disabled="isBusy">Save</button></div>`,
      { isBusy: true }
    );

    render();
    const btn = e.querySelector('button')!;
    expect(btn.hasAttribute('disabled')).toBe(true);

    // flip off
    (btn as any); // no-op to keep TS calm in some environments
  });

  it('re-renders and updates boolean attribute correctly', () => {
    const { e, sc, render } = createTest(
      `<div><button ?disabled="isBusy">Save</button></div>`,
      { isBusy: false }
    );

    render();
    const btn = e.querySelector('button')!;
    expect(btn.hasAttribute('disabled')).toBe(false);

    sc.isBusy = true;
    render();
    expect(btn.hasAttribute('disabled')).toBe(true);

    sc.isBusy = false;
    render();
    expect(btn.hasAttribute('disabled')).toBe(false);
  });
});
```

### src/tests/directives/if-directive.spec.ts

Referenced Tasks
- if-tests Tests für *if

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('*if directive', () => {
  it('renders content only when condition is truthy', () => {
    const { e, render } = createTest(
      `<div><p *if="flag">Visible</p></div>`,
      { flag: true }
    );

    render();
    expect(e.querySelector('p')?.textContent?.trim()).toBe('Visible');
  });

  it('does not render content when condition is falsy', () => {
    const { e, render } = createTest(
      `<div><p *if="flag">Hidden</p></div>`,
      { flag: false }
    );

    render();
    expect(e.querySelector('p')).toBeNull();
  });

  it('updates on re-render when condition changes', () => {
    const { e, sc, render } = createTest(
      `<div><p *if="flag">Toggle</p></div>`,
      { flag: false }
    );

    render();
    expect(e.querySelector('p')).toBeNull();

    sc.flag = true;
    render();
    expect(e.querySelector('p')?.textContent?.trim()).toBe('Toggle');

    sc.flag = false;
    render();
    expect(e.querySelector('p')).toBeNull();
  });
});
```

## Example prompts to improve the original request

- Sollen Event-Handler Zugriff auf das native Event erhalten (z. B. via Parameter: @click="(event) => ...")? Falls ja, passen wir den Generator entsprechend an.
- Sollen weitere Attributfälle getestet werden (z. B. data-* Attribute, mehrere Interpolationen im selben Attribut)?