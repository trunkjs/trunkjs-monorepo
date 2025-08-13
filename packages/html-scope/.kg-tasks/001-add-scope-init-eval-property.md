---
slugName: add-scope-init-eval-property
includeFiles:
- src/components/tj-html-scope/tj-html-scope.ts
- src/lib/html-scope.spec.ts
- src/lib/html-scope.ts
- src/index.ts
- tsconfig.lib.json
- tsconfig.json
- tsconfig.spec.json
- index.html
- vite.config.ts
- web-types.json
- package.json
- project.json
- README.md
- ../../.kindergarden.global.md
editFiles:
- src/components/tj-html-scope/tj-html-scope.ts
- src/utils/eval-scope-init.ts
- src/utils/eval-scope-init.spec.ts
- README.md
- web-types.json
original_prompt: Lege eine property scope-init an. Diese soll evald werden und den
  scope zurück liefern. Es kann direkt der input als json interpretiert werden oder
  z.b. querySelector..innerHTML oder auch await fetch angegeben sein. Mach einen kurzen
  Unittest, der diese 3 fälle abteset und beschreibe die Funktionalität. remember
  to keep the output format
---
# Prepare Add scope-init property with eval support

Add a new property/attribute scope-init on <tj-html-scope>. The value is evaluated and used to initialize/extend the component scope ($scope). The input supports:
- JSON string literal: e.g. {"name":"Alice"}
- Expression using DOM: e.g. document.querySelector('#data').innerHTML
- Async expression using await fetch(...): e.g. await fetch('/data.json').then(r => r.json())

Provide a short unit test covering these three cases. Document the feature.

## Assumptions

- scope-init is a string attribute that contains an expression, not a block of statements. It may use await.
- Evaluation runs in the context of the browser and can access host, window, document, and fetch.
- The evaluation result is normalized to an object:
  - If the result is an object/array: used directly (arrays wrapped as { value: [...] } would be surprising; we keep arrays as-is as a valid scope).
  - If the result is a string that looks like JSON (starts with { or [): parsed to an object/array.
  - Otherwise, primitives are wrapped as { value: <primitive> } to keep $scope an object.
- Complex evaluation logic goes into a utility under src/utils per repository guidelines.
- Unit tests run in node environment (no DOM). We will inject a fake document and fetch via the utility’s context parameter.

## Missing Information

- Error handling policy when eval fails. Assumption: log error via LoggingMixin and keep current scope unchanged.
- Merge semantics: Assumption: shallow merge into existing $scope (Object.assign).

## Tasks

- Add scope-init attribute Add new @property, evaluate it async, and merge the result into $scope. Re-render and emit scope-update.
- Create eval utility Implement async evalScopeInit with JSON parsing and expression/await support.
- Unit tests for 3 cases Test JSON, document.querySelector().innerHTML, and await fetch.
- Update web-types.json Document the new attribute.
- Update README Document usage with examples.

## Overview: File changes

- src/components/tj-html-scope/tj-html-scope.ts Add scope-init property, async evaluation, merge into scope, trigger re-render/event.
- src/utils/eval-scope-init.ts New utility implementing async evaluation and normalization.
- src/utils/eval-scope-init.spec.ts New unit tests for the three cases.
- web-types.json Document scope-init attribute.
- README.md Add feature description and examples.

## Detail changes

### src/components/tj-html-scope/tj-html-scope.ts

Referenced Tasks
- Add scope-init attribute Add property, evaluate and merge into scope. Re-render and emit scope-update.

Replace

```typescript
import { create_element, LoggingMixin } from '@trunkjs/browser-utils';
import { scopeDefine, ScopeDefinition, Template } from '@trunkjs/template';
import { ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const templateRenderInElement: WeakMap<HTMLTemplateElement, HTMLElement> = new WeakMap();
const templateClass: WeakMap<HTMLTemplateElement, Template> = new WeakMap();

@customElement('tj-html-scope')
export class TjHtmlScope extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn = 'change';

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

  override updated() {
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
  }

  override connectedCallback() {
    super.connectedCallback();
    this.log('Connected', this.$scope);
    this._updateScope();
    this._renderTemplates();
  }
}

declare global {
  interface TjHtmlScope {
    updateOn: string; // Comma-separated list of events to trigger updates
    debug?: boolean;
    $scope: ScopeDefinition;
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

by

```typescript
import { create_element, LoggingMixin } from '@trunkjs/browser-utils';
import { scopeDefine, ScopeDefinition, Template } from '@trunkjs/template';
import { ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { evalScopeInit } from '../../utils/eval-scope-init';

const templateRenderInElement: WeakMap<HTMLTemplateElement, HTMLElement> = new WeakMap();
const templateClass: WeakMap<HTMLTemplateElement, Template> = new WeakMap();

@customElement('tj-html-scope')
export class TjHtmlScope extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn = 'change';

  @property({ type: String, reflect: true, attribute: 'scope-init' })
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

  private async _applyScopeInit() {
    if (!this.scopeInit || this.scopeInit.trim() === '') return;
    try {
      const init = await evalScopeInit(this.scopeInit, {
        host: this,
        window: (typeof window !== 'undefined' ? window : undefined) as any,
        document: (typeof document !== 'undefined' ? document : undefined) as any,
        fetch: (typeof fetch !== 'undefined' ? fetch : undefined) as any,
      });

      // Shallow merge into existing scope
      Object.assign(this.$scope, init);

      // Re-render templates and notify listeners
      this._renderTemplates();
      this.dispatchEvent(new CustomEvent('scope-update'));
      this.log('Applied scope-init', init);
    } catch (err) {
      this.error('Failed to evaluate scope-init', err);
    }
  }

  override updated(changed: Map<string, unknown>) {
    this.log('Updated', this.$scope);
    const listener = () => {
      this._updateScope();
      this._renderTemplates();
      this.dispatchEvent(new CustomEvent('scope-update'));
    };

    for (const key of this.updateOn.replace(',', ' ').split(' ')) {
      if (key.trim() === '') continue;
      this.removeEventListener(key, listener);
      this.addEventListener(key, listener);
    }

    if (changed.has('scopeInit')) {
      // Evaluate new scope-init value
      this._applyScopeInit();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.log('Connected', this.$scope);
    this._updateScope();
    // Apply initial scope init asynchronously
    this._applyScopeInit();
    // Initial render
    this._renderTemplates();
  }
}

declare global {
  interface TjHtmlScope {
    updateOn: string; // Comma-separated list of events to trigger updates
    debug?: boolean;
    scopeInit?: string; // String to evaluate for initial scope
    $scope: ScopeDefinition;
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

### src/utils/eval-scope-init.ts

Referenced Tasks
- Create eval utility Implements parsing JSON, evaluating expressions including await, and normalization to object.

Add file with content:

```typescript
export interface EvalScopeInitContext {
  host?: any;
  window?: any;
  document?: any;
  fetch?: any;
}

function looksLikeJson(str: string): boolean {
  const s = str.trim();
  return (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'));
}

function normalizeToObject(res: unknown): Record<string, any> {
  if (res !== null && typeof res === 'object') {
    return res as Record<string, any>;
  }
  if (typeof res === 'string') {
    const t = res.trim();
    if (looksLikeJson(t)) {
      try {
        return JSON.parse(t);
      } catch {
        // fall through and wrap as value
      }
    }
    return { value: res };
  }
  return { value: res as any };
}

/**
 * Evaluate a scope-init input and return a normalized scope object.
 *
 * Supported inputs:
 * - JSON literal string: '{"a":1}'
 * - JS expression string, may use await: 'await fetch("/data").then(r=>r.json())'
 * - Direct object (will be returned)
 */
export async function evalScopeInit(
  input: unknown,
  context?: EvalScopeInitContext
): Promise<Record<string, any>> {
  if (input == null || input === '') return {};
  if (typeof input === 'object' && !(input instanceof String)) {
    return input as Record<string, any>;
  }

  const code = String(input).trim();

  // Try JSON first
  if (looksLikeJson(code)) {
    try {
      return JSON.parse(code);
    } catch {
      // continue to code evaluation
    }
  }

  // Evaluate as async expression: return ( async () => ( <expr> ) )()
  const asyncExprWrapper = `return (async () => ( ${code} ))()`;
  const asyncBodyWrapper = `return (async () => { ${code} })()`;

  const host = context?.host;
  const win = context?.window;
  const doc = context?.document;
  const fch = context?.fetch;

  try {
    const fn = new Function('host', 'window', 'document', 'fetch', 'scope', asyncExprWrapper);
    const res = await fn(host, win, doc, fch, {});
    return normalizeToObject(res);
  } catch {
    // Fallback: treat code as async body
    const fn = new Function('host', 'window', 'document', 'fetch', 'scope', asyncBodyWrapper);
    const res = await fn(host, win, doc, fch, {});
    return normalizeToObject(res);
  }
}
```

### src/utils/eval-scope-init.spec.ts

Referenced Tasks
- Unit tests for 3 cases Validate JSON, DOM expression, and await fetch.

Add file with content:

```typescript
import { describe, it, expect } from 'vitest';
import { evalScopeInit } from './eval-scope-init';

describe('evalScopeInit', () => {
  it('parses JSON literal input', async () => {
    const res = await evalScopeInit('{"a":1,"b":"x"}');
    expect(res).toEqual({ a: 1, b: 'x' });
  });

  it('evaluates document.querySelector().innerHTML and parses JSON string result', async () => {
    const fakeDoc = {
      querySelector: (sel: string) => {
        expect(sel).toBe('#data');
        return { innerHTML: '{"b":2,"ok":true}' };
      },
    };

    const res = await evalScopeInit('document.querySelector("#data").innerHTML', { document: fakeDoc as any });
    expect(res).toEqual({ b: 2, ok: true });
  });

  it('supports await fetch and returns parsed JSON', async () => {
    const fakeFetch = async (url: string) => {
      expect(url).toBe('/api/data.json');
      return {
        json: async () => ({ c: 3, list: [1, 2, 3] }),
      };
    };

    const res = await evalScopeInit('await fetch("/api/data.json").then(r => r.json())', { fetch: fakeFetch as any });
    expect(res).toEqual({ c: 3, list: [1, 2, 3] });
  });
});
```

### web-types.json

Referenced Tasks
- Update web types Document the new scope-init attribute.

Replace

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
                        }
                    ]
                }
            ]
        }
    }
}
```

by

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
              "description": "Initial scope expression. Supports JSON, DOM expressions (e.g. document.querySelector().innerHTML), and async await fetch(...)"
            },
            {
              "name": "update-on",
              "type": "string",
              "description": "Space/comma separated list of events to trigger updates (e.g. 'change keyup')"
            }
          ]
        }
      ]
    }
  }
}
```

### README.md

Referenced Tasks
- Update documentation Add feature description and examples.

Replace

```markdown
# html-scope

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build html-scope` to build the library.

## Running unit tests

Run `nx test html-scope` to execute the unit tests via [Vitest](https://vitest.dev/).
```

by

```markdown
# html-scope

Add lightweight scoping and templating to plain HTML.

## New: scope-init

Initialize the component scope from a string expression via the `scope-init` attribute. The value is evaluated and merged into `$scope`.

Supported forms:
- JSON: `{"name":"Alice","count":3}`
- DOM expression: `document.querySelector("#data").innerHTML`
- Async with fetch: `await fetch("/data.json").then(r => r.json())`

Examples:

```html
<!-- JSON literal -->
<tj-html-scope scope-init='{"name":"Alice","count":2}'>
  <template>
    <div>Hello {{name}} x {{count}}</div>
  </template>
</tj-html-scope>

<!-- From DOM -->
<div id="data" hidden>{"name":"Bob"}</div>
<tj-html-scope scope-init='document.querySelector("#data").innerHTML'>
  <template>
    <div>Hello {{name}}</div>
  </template>
</tj-html-scope>

<!-- Async fetch -->
<tj-html-scope scope-init='await fetch("/api/user.json").then(r=>r.json())'>
  <template>
    <div>User: {{user.name}}</div>
  </template>
</tj-html-scope>
```

Notes:
- The evaluation result is normalized to an object. Strings that look like JSON are parsed; other primitives become `{ value: <primitive> }`.
- On change of `scope-init`, the new result will be merged into `$scope` and a `scope-update` event is dispatched.

## Building

Run `nx build html-scope` to build the library.

## Running unit tests

Run `nx test html-scope` to execute the unit tests via [Vitest](https://vitest.dev/).
```

## Tips for request improvements

- Provide example expressions you expect to work with `scope-init`.
- Clarify merge strategy (shallow vs deep) if nested objects are expected to be updated frequently.
- Specify error handling requirements (fail hard vs. log and continue).

