---
slugName: scope-init-on-tj-html-scope
includeFiles:
- src/componentsj-html-scope/tj-html-scope.ts
- src/utils/evaluate-scope-init.ts
- src/utils/evaluate-scope-init.spec.ts
- README.md
- web-types.json
editFiles:
- src/components/tj-html-scope/tj-html-scope.ts
- src/utils/evaluate-scope-init.ts
- src/utils/evaluate-scope-init.spec.ts
- README.md
- web-types.json
original_prompt: Lege eine property scope-init an. Diese soll evald werden und den
  scope zurück liefern. Es kann direkt der input als json interpretiert werden oder
  z.b. querySelector..innerHTML oder auch await fetch angegeben sein. Mach einen kurzen
  Unittest, der diese 3 fälle abteset und beschreibe die Funktionalität. remember
  to keep the output format
---
# Prepare Add scope-init property to tj-html-scope

Add a new attribute/property scope-init to tj-html-scope. Its string value is evaluated to produce the initial scope:
- Direct JSON string is parsed.
- JS expression like document.querySelector('#id').innerHTML is evaluated. If it yields a JSON string, it’s parsed.
- Async expressions with await (e.g., fetch) are supported.

A short unit test must cover all three cases. Provide brief documentation.

## Assumptions

- Executing scope-init involves evaluating arbitrary expressions. This is intended for trusted input only; we’ll document the risk.
- We keep evaluation logic out of the web component per repo guidelines by adding a utility in src/utils.
- The Template class from @trunkjs/template captures the scope on instantiation. Therefore, when scope changes via scope-init, we must re-create Template instances for templates inside the component.
- Tests run in a Node environment (not jsdom), so we will mock global document and fetch in tests.

## Tasks

- **add-evaluator-util** Implement evaluateScopeInit utility that parses JSON or evaluates async JS and returns a scope object.
- **extend-component** Add scope-init property to tj-html-scope and initialize/refresh scope from it, re-rendering templates safely.
- **unit-tests** Add a concise unit test covering JSON, querySelector..innerHTML, and await fetch cases.
- **docs** Update README with examples and security note.
- **web-types** Expose the new attribute in web-types.json.

## Overview: File changes

- src/utils/evaluate-scope-init.ts New utility to evaluate scope-init expressions (JSON, DOM, fetch).
- src/utils/evaluate-scope-init.spec.ts Unit tests for three evaluation cases.
- src/components/tj-html-scope/tj-html-scope.ts Add scope-init property, async init flow, template cache reset, and re-render logic.
- README.md Document scope-init usage with examples and notes.
- web-types.json Add scope-init attribute metadata.

## Detail changes

### src/utils/evaluate-scope-init.ts

Referenced Tasks
- add-evaluator-util Implement evaluator that supports JSON, expression, and await fetch cases.
- unit-tests Export pure function for testing.

Create this new file with the following content:

```ts
// src/utils/evaluate-scope-init.ts

/**
 * Evaluate the provided scope-init string and return a scope object.
 * - If the value is valid JSON, it is parsed and returned.
 * - Otherwise, it is evaluated as an async JS expression with access to
 *   window, document, fetch. If the result is a JSON string, it's parsed.
 * - Non-object results are wrapped as { value: <result> }.
 *
 * WARNING: This evaluates arbitrary code. Use only with trusted input.
 */
export interface EvaluateScopeContext {
  window?: any;
  document?: any;
  fetch?: any;
}

function normalizeToObject(val: any): Record<string, any> {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  return { value: val };
}

export async function evaluateScopeInit(
  input?: string | null,
  ctx?: EvaluateScopeContext
): Promise<Record<string, any>> {
  if (!input || input.trim() === '') return {};

  const code = input.trim();

  // 1) Try direct JSON
  try {
    const parsed = JSON.parse(code);
    return normalizeToObject(parsed);
  } catch {
    // not JSON
  }

  // 2) Evaluate as async JS expression
  const fn = new Function(
    'ctx',
    `
    const window = ctx.window ?? (typeof window !== 'undefined' ? window : globalThis);
    const document = ctx.document ?? (typeof document !== 'undefined' ? document : undefined);
    const fetch = ctx.fetch ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    const self = window;
    return (async () => { return (${code}); })();
  `
  ) as (ctx: EvaluateScopeContext) => Promise<any>;

  let result = await fn(ctx ?? {});

  // If result is a JSON-like string, parse it
  if (typeof result === 'string') {
    const s = result.trim();
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try {
        result = JSON.parse(s);
      } catch {
        // keep as string if parsing fails
      }
    }
  }

  return normalizeToObject(result);
}

export default evaluateScopeInit;
```

### src/utils/evaluate-scope-init.spec.ts

Referenced Tasks
- unit-tests Cover the three required cases.

Create this new test file:

```ts
// src/utils/evaluate-scope-init.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluateScopeInit } from './evaluate-scope-init';

describe('evaluateScopeInit', () => {
  beforeEach(() => {
    // Reset mocks before each test
    // @ts-expect-error Allow reassigning globals in tests
    globalThis.document = undefined;
    // @ts-expect-error Allow reassigning globals in tests
    globalThis.fetch = undefined;
  });

  it('parses direct JSON', async () => {
    const scope = await evaluateScopeInit('{"name":"Alice","repeatCount":3}');
    expect(scope).toEqual({ name: 'Alice', repeatCount: 3 });
  });

  it('evaluates DOM expression and parses innerHTML JSON', async () => {
    const mockDoc = {
      querySelector: vi.fn(() => ({ innerHTML: '{"foo":"bar"}' })),
    };
    // @ts-expect-error test mock
    globalThis.document = mockDoc;

    const expr = "document.querySelector('#data').innerHTML";
    const scope = await evaluateScopeInit(expr);

    expect(mockDoc.querySelector).toHaveBeenCalledWith('#data');
    expect(scope).toEqual({ foo: 'bar' });
  });

  it('supports await fetch expressions', async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ a: 1, b: 2 }),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const expr = "await fetch('/api/scope').then(r => r.json())";
    const scope = await evaluateScopeInit(expr);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(scope).toEqual({ a: 1, b: 2 });
  });
});
```

### src/components/tj-html-scope/tj-html-scope.ts

Referenced Tasks
- extend-component Add scope-init property and integrate evaluation.
- extend-component Recreate Template instances when scope changes from scope-init.

Replace the file content with the following updated version (keep non-relevant parts as they are; only changed/added areas are marked):

```ts
import { create_element, LoggingMixin } from '@trunkjs/browser-utils';
import { scopeDefine, ScopeDefinition, Template } from '@trunkjs/template';
import { ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';
import { evaluateScopeInit } from '../../utils/evaluate-scope-init';

const templateRenderInElement: WeakMap<HTMLTemplateElement, HTMLElement> = new WeakMap();
const templateClass: WeakMap<HTMLTemplateElement, Template> = new WeakMap();

@customElement('tj-html-scope')
export class TjHtmlScope extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn = 'change';

  // NEW: Initial scope provider via evaluated expression/JSON
  @property({ type: String, attribute: 'scope-init' })
  public scopeInit?: string;

  public $scope: ScopeDefinition;

  constructor() {
    super();
    this.$scope = scopeDefine({});
  }

  override createRenderRoot() {
    // We don't want to use a shadow DOM, so we return the host element itself
    return this;
  }

  private _renderTemplates() {
    for (const template of Array.from(this.querySelectorAll('template'))) {
      if (!templateRenderInElement.has(template)) {
        // Create a new Element below template
        const rendersInElment = create_element('div', { style: 'display: contents' });
        templateRenderInElement.set(template, rendersInElment);
        template.parentElement?.insertBefore(rendersInElment, template.nextSibling);
        templateClass.set(template, new Template(template.innerHTML, this.$scope));
      }

      // Render the template in the element
      templateClass.get(template)?.renderInElement(templateRenderInElement.get(template) as HTMLElement);
    }
  }

  private _updateScope() {
    for (const input of Array.from(this.querySelectorAll('[name]') as unknown as HTMLInputElement[])) {
      const name = input.getAttribute('name');
      if (name && input.value !== undefined) {
        this.$scope[name] = input.value;
      }
    }
  }

  // NEW: Clear template cache for templates within this instance
  private _resetTemplateCache() {
    for (const template of Array.from(this.querySelectorAll('template'))) {
      const holder = templateRenderInElement.get(template);
      if (holder) {
        holder.innerHTML = '';
        templateRenderInElement.delete(template);
      }
      templateClass.delete(template);
    }
  }

  // NEW: Initialize scope based on scope-init (async)
  private async _initScopeFromProperty() {
    try {
      const evaluated = await evaluateScopeInit(this.scopeInit, {
        window: window,
        document: document,
        fetch: typeof fetch !== 'undefined' ? fetch : undefined,
      });
      // Recreate the scope to ensure Template binds to the new scope object
      this.$scope = scopeDefine(evaluated);
      this.log('scope-init evaluated', this.$scope);
    } catch (err) {
      this.log('scope-init evaluation failed', err);
      // Keep existing scope on error
    }
  }

  override updated(changed: PropertyValues) {
    this.log('Updated', this.$scope);
    const listener = () => {
      this._updateScope();
      this._renderTemplates();
    };

    for (const key of this.updateOn.replace(',', ' ').split(' ')) {
      if (key.trim() === '') continue;
      this.removeEventListener(key, listener);
      this.addEventListener(key, listener);
    }

    // NEW: React to scope-init changes
    if (changed.has('scopeInit')) {
      void this._initScopeFromProperty().then(() => {
        this._updateScope();
        this._resetTemplateCache();
        this._renderTemplates();
      });
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.log('Connected', this.$scope);

    // NEW: Initialize from scope-init first, then render
    void this._initScopeFromProperty().then(() => {
      this._updateScope();
      this._renderTemplates();
    });
  }
}

declare global {
  interface TjHtmlScope {
    updateOn: string; // Comma-separated list of events to trigger updates
    debug?: boolean;
    $scope: ScopeDefinition;
    scopeInit?: string; // NEW: initialization expression/JSON string
  }
  interface HTMLElementTagNameMap {
    'tj-html-scope': TjHtmlScope;
  }

  interface Window {
    TjHtmlScope: typeof TjHtmlScope;
  }

  interface HTMLElementEventMap {
    'scope-update': CustomEvent<void>;
  }

  interface ElementEventMap {
    'scope-update': CustomEvent<void>;
  }
}
```

### web-types.json

Referenced Tasks
- web-types Add new attribute for IDE assistance.

Update the element metadata by adding the scope-init attribute entry:

```json
{
  "name": "jt-html-scope",
  "version": "1.0.0",
  "contributions": {
    "html": {
      "elements": [
        {
          "name": "tj-html-scope",
          "description": "Add logic scope to the html elements below",
          "attributes": [
            {
              "name": "debug",
              "type": "boolean",
              "description": "Enable debug mode (output debug information to the console)"
            },
            {
              "name": "scope-init",
              "type": "string",
              "description": "Initialize scope from JSON or an async JS expression (e.g., document.querySelector(...).innerHTML, await fetch(...))."
            }
          ]
        }
      ]
    }
  }
}
```

Note: Keep the rest of the file unchanged; only add the new attribute object as shown.

### README.md

Referenced Tasks
- docs Document scope-init usage and caveats.

Replace content with the following updated documentation:

```md
# html-scope

Add lightweight logic scoping and templating to plain HTML.

## Building

Run `nx build html-scope` to build the library.

## Running unit tests

Run `nx test html-scope` to execute the unit tests via [Vitest](https://vitest.dev/).

## tj-html-scope: scope-init

Initialize the internal scope via a JSON string or an evaluated async JS expression.

Security note: scope-init evaluates code in the page context. Only use trusted input.

Examples:

- Direct JSON

```html
<tj-html-scope
  scope-init='{"name":"World","repeatCount":3}'
  update-on="change keyup">
  <template>
    <div *for="i of Array.from({ length: repeatCount })">Hello {{name}}</div>
  </template>

  <input type="text" name="name" value="World" />
  <input type="number" name="repeatCount" value="3" />
</tj-html-scope>
```

- From DOM (querySelector..innerHTML)

```html
<div id="data" hidden>{"name":"DOM","repeatCount":2}</div>

<tj-html-scope scope-init="document.querySelector('#data').innerHTML">
  <template>
    <div *for="i of Array.from({ length: repeatCount })">Hello {{name}}</div>
  </template>
</tj-html-scope>
```

- Async fetch

```html
<tj-html-scope scope-init="await fetch('/api/scope').then(r => r.json())">
  <template>
    <div>Hello {{name}}</div>
  </template>
</tj-html-scope>
```

Behavior:
- JSON input is parsed (objects/arrays). Non-object results are wrapped as `{ value: <result> }`.
- Expressions are evaluated in an async function with access to `window`, `document`, and `fetch`.
- If an expression returns a JSON string, it is parsed.
- Changing `scope-init` at runtime re-initializes the scope and re-renders templates.
- User inputs with `name` attributes still update/override scope on configured events (`update-on`).
```

## Example prompts to improve the original request

- “scope-init should only be evaluated once on connect or also on attribute changes?” (Currently: both on connect and on change.)
- “Should we throw on invalid expressions or silently keep previous scope?” (Currently: keep previous scope and log.)
- “Should non-object results be rejected instead of wrapped?” (Currently: wrapped as `{ value }`.)

```