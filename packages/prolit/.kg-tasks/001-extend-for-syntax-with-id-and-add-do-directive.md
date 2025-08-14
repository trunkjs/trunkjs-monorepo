---
slugName: extend-for-syntax-with-id-and-add-do-directive
includeFiles:
- ./src/parser/Element2Function.ts
- ./src/lib/lit-env.ts
- ./src/tests/utils/createTest.ts
- ./src/tests/directives/for-directive.spec.ts
- ./src/tests/directives/for-repeat-id.spec.ts
- ./src/tests/directives/do-directive.spec.ts
- ./README.md
- ./.README/200-writing-templates.md
- ./.README/210-attribute-directives.md
- ./vite.config.ts
- ./tsconfig.spec.json
editFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/directives/for-repeat-id.spec.ts
- ./src/tests/directives/do-directive.spec.ts
- ./.README/200-writing-templates.md
- ./.README/210-attribute-directives.md
- ./README.md
original_prompt: Erweitere die syntax von for um einen optionalen per Semikolon getrennten
  id-identifier. Nutze dann lit repeat statt dem mapping, und übergib den id identifier.
  Füge eine *do anweisung hizu, die einfach code ausführt um z.b. Variablen zu setzen.
---
# Prepare: *for Syntax erweitern (optional "; id …"), lit repeat nutzen, und *do Direktive hinzufügen

Erweitere die Template-Syntax:
- *for unterstützt optional einen per Semikolon getrennten id-Ausdruck zur Key-Bildung und verwendet lit-htmls repeat statt Array.map.
- Neue Direktive *do führt beliebigen Code im Scopes aus (z. B. Variablen setzen), bevor die Inhalte gerendert werden.

## Assumptions

- Syntax für *for:
  - Basis: "*for='item of items'"
  - Mit Key: "*for='item of items; id: item.id'" (unterstützt auch "; id item.id" oder "; id=item.id")
- repeat wird aus lit-html/directives/repeat.js importiert und steht bereits in litEnv als repeat zur Verfügung.
- index ist weiterhin im Schleifenkörper verfügbar.
- "in"-Variante bleibt wie bisher unsupported (kein Render, aber auch kein Throw), nur "of" rendert.
- *do führt Code im Kontext von with($scope){ ... } unmittelbar vor dem Rendern des umschlossenen Elements aus.

## Missing Information

- Wenn die Key-Funktion fehlschlägt (z. B. undefined), gibt es aktuell kein gesondertes Error-Handling. Wir gehen davon aus, dass dies akzeptabel ist.
- Falls ein explizites Verhalten für "in" gewünscht ist (throw vs. ignore), bitte spezifizieren.

## Tasks

- *for: Parser erweitern um optionalen "; id ..." Teil und Nutzung von repeat statt .map
- *do: Neue Direktive implementieren, die Code ausführt und anschließend die Inhalte rendert
- Tests ergänzen: for mit id-Teil; do-Direktive
- Doku aktualisieren: *for mit id und *do in den Attribut-Direktiven dokumentieren, Übersichtstabelle ergänzen

## Overview: File changes

- src/parser/Element2Function.ts Implementiere repeat-Aufruf inkl. optionaler Key-Funktion; implementiere *do Direktive
- src/tests/directives/for-repeat-id.spec.ts Neue Tests für *for mit "; id"
- src/tests/directives/do-directive.spec.ts Neue Tests für *do
- ./.README/210-attribute-directives.md Doku für *for mit id und *do
- ./.README/200-writing-templates.md Beispiele erweitern
- ./README.md Tabelle der Direktiven ergänzen (id & *do)

## Detail changes

### src/parser/Element2Function.ts

Referenced Tasks
- *for Parser erweitern um "; id …" und repeat nutzen
- *do Direktive hinzufügen

Replace method wrapStrucutre entirely by:

```typescript
protected wrapStrucutre(element: AstHtmlElement, code: string): string {
  const wrapper: { start: string; end: string }[] = [];
  for (const attr of element.attributes || []) {
    if (!attr.name.startsWith('*')) {
      continue;
    }
    if (attr.name === '*if') {
      wrapper.push({
        start: `$$__litEnv.when(${attr.value}, ()=>{lastIf=true; return   `,
        end: '}, ()=>{lastIf=false; return $$__litEnv.html``})',
      });
      continue;
    }

    if (attr.name === '*do') {
      // Execute code then return inner html
      wrapper.push({
        start: `(()=>{ ${attr.value}; return `,
        end: '})()',
      });
      continue;
    }

    if (attr.name === '*for') {
      // Support: <local> in|of <iterable>[; id[:|=| ] <keyExpr>]
      const raw = attr.value || '';
      const match = /^\s*([A-Za-z_$][\w$]*)\s+(in|of)\s+(.+?)(?:\s*;\s*id\s*(?::|=|\s)\s*(.+))?\s*$/.exec(raw);
      if (!match) {
        throw new Error(`Invalid *for attribute value: ${attr.value}`);
      }
      const local = match[1].trim();
      const mode = match[2].trim();
      const iterable = match[3].trim();
      const keyExpr = (match[4] ?? '').trim();

      if (mode === 'of') {
        if (keyExpr) {
          // With key function: repeat(items, (item, index) => key, (item, index) => html`...`)
          wrapper.push({
            start: `$$__litEnv.repeat(${iterable}, (${local}, index) => ${keyExpr}, (${local}, index) => `,
            end: ')',
          });
        } else {
          // Without key: repeat(items, (item, index) => html`...`)
          wrapper.push({
            start: `$$__litEnv.repeat(${iterable}, (${local}, index) => `,
            end: ')',
          });
        }
      }
      // "in" stays unsupported: do not wrap (keeps element as-is)
      continue;
    }
    throw new Error(`Unknown attribute ${attr.name} in element ${element.tagName}`);
  }

  if (wrapper.length === 0) {
    return code;
  }
  let ret = '$$__litEnv.html`' + code + '`'; // Start with a template literal for HTML
  for (let i = wrapper.length - 1; i >= 0; i--) {
    ret = wrapper[i].start + ret + wrapper[i].end;
  }
  return '${' + ret + '}'; // Wrap the final result in a string concatenation
}
```

Note: No other changes are required in this file. All other logic remains untouched.

### src/tests/directives/for-repeat-id.spec.ts

Referenced Tasks
- Tests für *for mit "; id ..." und Nutzung von repeat

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

function getLiTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('ul > li')).map((li) => (li.textContent ?? '').trim());
}

describe('*for directive with ; id ... (repeat)', () => {
  it('renders with id key specified via colon syntax', () => {
    const { e, render } = createTest(
      `<ul><li *for="t of todos; id: t">{{ t }}</li></ul>`,
      { todos: ['a', 'b'] }
    );
    render();
    expect(getLiTexts(e)).toEqual(['a', 'b']);
  });

  it('renders with id key specified via space syntax', () => {
    const { e, render } = createTest(
      `<ul><li *for="t of todos; id t">{{ t }}</li></ul>`,
      { todos: ['x', 'y'] }
    );
    render();
    expect(getLiTexts(e)).toEqual(['x', 'y']);
  });

  it('exposes index with keyed repeat as well', () => {
    const { e, render } = createTest(
      `<ul><li *for="t of todos; id: t">{{ index }}-{{ t }}</li></ul>`,
      { todos: ['p', 'q', 'r'] }
    );
    render();
    expect(getLiTexts(e)).toEqual(['0-p', '1-q', '2-r']);
  });
});
```

### src/tests/directives/do-directive.spec.ts

Referenced Tasks
- Tests für *do Direktive

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { createTest } from '../utils/createTest';

describe('*do directive', () => {
  it('executes inline code before rendering element content', () => {
    const { e, render } = createTest(
      `<div *do="x = 41 + 1"><span>{{ x }}</span></div>`,
      { x: 0 }
    );
    render();
    const span = e.querySelector('span');
    expect(span?.textContent?.trim()).toBe('42');
  });

  it('can initialize local variables used in expressions', () => {
    const { e, render } = createTest(
      `<div *do="greeting = 'Hello'"><span>{{ greeting }}, {{ name }}!</span></div>`,
      { name: 'World' }
    );
    render();
    const span = e.querySelector('span');
    expect(span?.textContent?.trim()).toBe('Hello, World!');
  });
});
```

### ./.README/210-attribute-directives.md

Referenced Tasks
- Doku aktualisieren für *for (; id ...) und *do

Update the section for *for and add a new section for *do. Replace the existing *for section with:

```markdown
## *for

Syntax
```html
<li *for="item of items">...</li>
<li *for="item of items; id: item.id">...</li>
<!-- id kann auch ohne Doppelpunkt angegeben werden -->
<li *for="item of items; id item.id">...</li>
```

Behavior
- Iteriert über Arrays und rendert für jedes Element.
- Intern wird lit-htmls `repeat` verwendet:
  - Ohne `id`: `repeat(items, (item, index) => html`...`)`
  - Mit `id`: `repeat(items, (item, index) => key, (item, index) => html`...`)`
- `index` ist im Schleifenkörper verfügbar.

Example
```html
<li *for="t of todos; id: t.id">#{{ index }} {{ t.title }}</li>
```

Limitations
- Nur `of` wird unterstützt. `in` rendert nicht (keine Exception).
```

Append a new section:

```markdown
## *do

Syntax
```html
<div *do="code">...</div>
```

Behavior
- Führt den angegebenen Code beim Rendern im Scope aus und rendert anschließend das umschlossene Element.
- Nützlich, um z. B. lokale Variablen vorzubereiten oder Zustände zu initialisieren.

Example
```html
<div *do="greeting = 'Hello'">
  <span>{{ greeting }}, {{ user.name }}</span>
</div>
```
```

### ./.README/200-writing-templates.md

Referenced Tasks
- Beispiele um ; id sowie *do erweitern

Append to “Loop and condition” examples:

```markdown
Keyed loop with repeat
```html
<ul>
  <li *for="t of todos; id: t.id">{{ t.title }}</li>
</ul>
```

Execute code before rendering
```html
<div *do="prefix = '>'">
  <span>{{ prefix }} {{ value }}</span>
</div>
```
```

### ./README.md

Referenced Tasks
- Übersichtstabelle der Direktiven ergänzen

Modify the “Attribute directives overview” table to include the keyed for note and the new *do directive. Replace the table block with:

```markdown
## Attribute directives overview

| Directive | Syntax | Example | Notes |
|---|---|---|---|
| Conditional | `*if="expr"` | `<p *if="flag">Visible</p>` | Renders when truthy; compiled to `when()`. No explicit `else`. |
| Loop | `*for="item of items[; id: key]"` | `<li *for="t of todos; id: t.id">{{ t }}</li>` | Uses `repeat`. `index` available. `in` unsupported (ignored). |
| Do (side effects) | `*do="code"` | `<div *do="x = 1 + 1">...</div>` | Executes code in scope before rendering the element. |
| Event listener | `@event="statement(s)"` | `<button @click="count++; $update()">+</button>` | Inline handler runs in template scope; call `$update()` to re-render. |
| Property binding | `.prop="expr"` | `<input .value="name">` | Binds element property. |
| Boolean attribute | `?attr="expr"` | `<button ?disabled="isBusy">Save</button>` | Toggles presence based on boolean. |
| Interpolation | `{{ expr }}` | `<span>Hello {{ user.name }}</span>` | Works in text and quoted attribute values. |
| Reference (experimental) | `$ref="code"` | `<div $ref="elRef = $el"></div>` | Parser may emit `ref`; runtime env incomplete. |
```

## Example prompts to improve the original request

- Sollen wir für die `in`-Variante künftig eine Exception werfen oder das bisherige „silent ignore“-Verhalten beibehalten?
- Sollen wir einen zusätzlichen Test für DOM-Stabilität bei Reorder (Keyed repeat) ergänzen, z. B. über das Prüfen von Node-Identitäten?