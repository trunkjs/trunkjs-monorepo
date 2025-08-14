---
slugName: add-unittests-for-class-and-style-directives
includeFiles:
- ./src/parser/Element2Function.ts
- ./src/lib/lit-env.ts
- ./src/tests/utils/createTest.ts
- ./src/tests/directives/class-map.spec.ts
- ./src/tests/directives/style-map.spec.ts
editFiles:
- ./src/tests/directives/class-map.spec.ts
- ./src/tests/directives/style-map.spec.ts
original_prompt: Erstelle tests for ~class und ~style
---
# Prepare: Unittests für ~class und ~style Direktiven

Erstelle Unit-Tests für die Attribut-Direktiven:
- ~class → nutzt lit’s classMap
- ~style → nutzt lit’s styleMap

## Assumptions

- ~class und ~style sind bereits in Element2Function implementiert und mappen auf $$__litEnv.classMap bzw. $$__litEnv.styleMap.
- Änderungen an den zugrunde liegenden Objekten (Mutation) werden nach erneutem render() korrekt übernommen (classMap/styleMap verwalten intern vorherige Werte).
- Wenn statische class/style Attribute zusätzlich zu ~class/~style verwendet werden, gewinnt das zuletzt gesetzte Attribut (HTML-Regel für doppelte Attribute). Wir testen daher nur reine ~class/~style Nutzung.

## Tasks

- class-tests: Teste dynamische Klassen-Zuordnung via ~class inkl. Umschalten durch Scope-Änderungen
- style-tests: Teste dynamische Styles via ~style inkl. Update und Entfernen von Style-Properties

## Overview: File changes

- src/tests/directives/class-map.spec.ts Neu: Tests für ~class (classMap) inkl. Toggle
- src/tests/directives/style-map.spec.ts Neu: Tests für ~style (styleMap) inkl. Update/Remove

## Detail changes

### src/tests/directives/class-map.spec.ts

Referenced Tasks
- class-tests Teste dynamische Klassen-Zuordnung via ~class

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('~class directive (classMap)', () => {
  it('applies classes from an object and updates on re-render', () => {
    const { e, sc, render } = createTest(
      `<div><span ~class="cls">X</span></div>`,
      { cls: { active: true, disabled: false } }
    );

    render();
    const span = e.querySelector('span') as HTMLSpanElement;
    expect(span.classList.contains('active')).toBe(true);
    expect(span.classList.contains('disabled')).toBe(false);

    // enable disabled
    sc.cls.disabled = true;
    render();
    expect(span.classList.contains('active')).toBe(true);
    expect(span.classList.contains('disabled')).toBe(true);

    // disable active
    sc.cls.active = false;
    render();
    expect(span.classList.contains('active')).toBe(false);
    expect(span.classList.contains('disabled')).toBe(true);
  });

  it('works with inline object expression using scope vars', () => {
    const { e, sc, render } = createTest(
      `<div><span ~class="{ on: isOn, off: !isOn }">Y</span></div>`,
      { isOn: false }
    );

    render();
    const span = e.querySelector('span') as HTMLSpanElement;
    expect(span.classList.contains('on')).toBe(false);
    expect(span.classList.contains('off')).toBe(true);

    sc.isOn = true;
    render();
    expect(span.classList.contains('on')).toBe(true);
    expect(span.classList.contains('off')).toBe(false);
  });
});
```

### src/tests/directives/style-map.spec.ts

Referenced Tasks
- style-tests Teste dynamische Styles via ~style

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('~style directive (styleMap)', () => {
  it('applies styles from an object and updates on re-render', () => {
    const { e, sc, render } = createTest(
      `<div><span ~style="st">X</span></div>`,
      { st: { color: 'red' as any } }
    );

    render();
    const span = e.querySelector('span') as HTMLSpanElement;
    expect(span.style.color).toBe('red');

    sc.st.color = 'blue';
    render();
    expect(span.style.color).toBe('blue');

    sc.st.display = 'none';
    render();
    expect(span.style.display).toBe('none');

    // remove property by setting null/undefined
    sc.st.display = null as any;
    render();
    expect(span.style.display).toBe('');
  });

  it('supports camelCase CSS properties like backgroundColor', () => {
    const { e, sc, render } = createTest(
      `<div><span ~style="{ backgroundColor: bg }">Z</span></div>`,
      { bg: 'rgb(255, 0, 0)' }
    );

    render();
    const span = e.querySelector('span') as HTMLSpanElement;
    expect(span.style.backgroundColor).toBe('rgb(255, 0, 0)');

    sc.bg = 'green';
    render();
    expect(span.style.backgroundColor).toBe('green');
  });
});
```

## Example prompts to improve the original request

- Sollen wir das Zusammenspiel von statischem class/style Attribut und ~class/~style spezifizieren (z. B. Zusammenführen statt Überschreiben)?
- Sollen weitere Edge-Cases getestet werden (z. B. Entfernen von Klassen/Styles via undefined vs. null vs. leere Strings)?