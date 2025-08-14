---
slugName: implement-do-and-log-directives
includeFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/utils/createTest.ts
- ./src/tests/directives/for-directive-array.spec.ts
- ./src/tests/directives/for-directive-object.spec.ts
- ./tsconfig.spec.json
- ./package.json
- ./project.json
- ./tsconfig.json
- ./tsconfig.lib.json
- ./tsconfig.spec.json
editFiles:
- ./src/parser/Element2Function.ts
- ./src/tests/directives/do-directive.spec.ts
- ./src/tests/directives/log-directive.spec.ts
original_prompt: implelentiere eine package.json project.json tsconfig.json tsconfig.lib.json
  tsconfig.spec.json directive, die einfach nur den inhalt z.b. zum setzen von variablen
  ausführt und eine *log direktive, die den ausdruck an console log sendet.
---
# Prepare: Implement *do and *log directives

Add two attribute directives:
- *do: Executes inline code in the current template scope, then renders its element.
- *log: Logs the given expression to console.log, then renders its element.

These directives can be combined with other structural directives (e.g., *if, *for).

## Assumptions

- Syntax:
  - *do="code" executes the provided code in template scope.
  - *log="expr" evaluates expr in template scope and logs the result via console.log.
- Both directives wrap the element’s rendered content and must return the original content after the side effect.
- They can be stacked with existing wrappers; order of attributes on the element defines wrapper nesting order.
- No special error handling is required if the provided code throws; it should surface as a render error.

## Tasks

- implement-do Add support for *do in the parser (executes code, returns wrapped content)
- implement-log Add support for *log in the parser (logs expression, returns wrapped content)
- test-do Add unit tests covering *do behavior
- test-log Add unit tests covering *log behavior

## Overview: File changes

- src/parser/Element2Function.ts Add *do and *log support in wrapStrucutre()
- src/tests/directives/do-directive.spec.ts New: tests for *do
- src/tests/directives/log-directive.spec.ts New: tests for *log

## Detail changes

### src/parser/Element2Function.ts

Referenced Tasks
- implement-do
- implement-log

Replace the method wrapStrucutre entirely with the following implementation (preserves existing behavior and adds new directives):

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
      // Execute arbitrary inline code in scope, then return inner html
      wrapper.push({
        start: `(()=>{ ${attr.value}; return `,
        end: '})()',
      });
      continue;
    }

    if (attr.name === '*log') {
      // Log the expression result, then render inner html
      wrapper.push({
        start: `(()=>{ console.log(${attr.value}); return `,
        end: '})()',
      });
      continue;
    }

    if (attr.name === '*for') {
      // <localName> in <array> or <localName> of <array> [; <keyExpr>]
      const match = /^(.*?)\s+(in|of)\s+(.*?)(;(.*?))?$/.exec(attr.value || '');
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
        wrapper.push({ start: `$$__litEnv.repeat(Object.keys(${match[3]}), ${indexBy}, (${match[1]}, $index) => `, end: ')' });
      }
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

Notes:
- This preserves existing behavior for *if and *for.
- New wrappers are IIFEs that perform side effects and then return the original inner content as a TemplateResult.

### src/tests/directives/do-directive.spec.ts

Referenced Tasks
- test-do

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

### src/tests/directives/log-directive.spec.ts

Referenced Tasks
- test-log

Create file with:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTest } from '../utils/createTest';

describe('*log directive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs expression result and still renders content', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { e, render } = createTest(
      `<div *log="name"><span>{{ name }}</span></div>`,
      { name: 'Alice' }
    );

    render();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Alice');
    const span = e.querySelector('span');
    expect(span?.textContent?.trim()).toBe('Alice');
  });

  it('supports arbitrary expressions', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { render } = createTest(
      `<div *log="1 + 1"></div>`,
      {}
    );

    render();
    expect(spy).toHaveBeenCalledWith(2);
  });
});
```

## Example prompts to improve the original request

- Sollen mehrere Ausdrücke in *log unterstützt werden, z. B. via Komma-separierter Liste (*log="a, b, c")? Wenn ja, wie genau loggen (einzelne calls vs. Array)?
- Sollen *do und *log auch auf void-Elements erlaubt sein? Aktuell werden sie wie alle Elemente behandelt; bei void-Elements gibt es keinen Inner-Content, aber der Side-Effect wird dennoch ausgeführt.