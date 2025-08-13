---
slugName: add-scope-init-property
includeFiles:
- ./src/components/tj-html-scope/tj-html-scope.ts
- ./src/utils/scope-init.ts
- ./src/utils/scope-init.spec.ts
- ./vite.config.ts
- ./web-types.json
- ./README.md
- ./src/index.ts
- ./src/lib/html-scope.spec.ts
- ./src/lib/html-scope.ts
editFiles:
- ./src/components/tj-html-scope/tj-html-scope.ts
- ./src/utils/scope-init.ts
- ./src/utils/scope-init.spec.ts
- ./vite.config.ts
- ./web-types.json
- ./README.md
original_prompt: Lege eine property scope-init an. Diese soll evald werden und den
  scope zurück liefern. Es kann direkt der input als json interpretiert werden oder
  z.b. querySelector..innerHTML oder auch await fetch angegeben sein. Mach einen kurzen
  Unittest, der diese 3 fälle abteset und beschreibe die Funktionalität. remember
  to keep the output format
---
# Prepare Add scope-init property to tj-html-scope

Add a new attribute/property scope-init on tj-html-scope which is evaluated to initialize/extend the component scope. The value may be:
- JSON directly
- A DOM expression like document.querySelector(...).innerHTML
- An async expression using await fetch(...)

Provide a short unit test that covers these three cases and document the feature.

## Assumptions

- scope-init is evaluated as a JavaScript expression in a controlled async wrapper with access to window, document, fetch and the current scope via the variable scope.
- When the expression result is a string, we try to parse it as JSON. If parsing fails, result is ignored (empty object).
- The evaluated result must be an object to be merged into the existing scope. Non-object results are ignored.
- For safety: This feature executes user-provided code. Consumers are responsible for not injecting untrusted expressions.

## Tasks

- Implement evaluateScopeInitExpression utility Evaluate scope-init string and return an object (supports JSON, DOM, and async fetch).
- Integrate scope-init into tj-html-scope Evaluate on connect and on attribute change, merge into scope and render.
- Add unit tests for 3 cases Cover JSON, querySelector().innerHTML, and await fetch cases.
- Switch test env to jsdom Needed for DOM and fetch in tests.
- Update web-types.json Document scope-init attribute for IDEs.
- Update README Document usage and examples.

## Overview: File changes

- ./src/components/tj-html-scope/tj-html-scope.ts Add scope-init property, evaluate on connect/changes, integrate rendering.
- ./src/utils/scope-init.ts New utility with evaluation logic.
- ./src/utils/scope-init.spec.ts New tests for JSON, DOM, fetch cases.
- ./vite.config.ts Set test.environment to "jsdom" for DOM-based tests.
- ./web-types.json Add attribute definition for scope-init.
- ./README.md Add feature documentation and examples.

## Detail changes

### ./src/utils/scope-init.ts

Create new file.

```typescript
// src/utils/scope-init.ts
import type { ScopeDefinition } from '@trunkjs/template';

function tryParseJson<T = unknown>(input: string): T | undefined {
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}

export type ScopeInitObject = Record<string, unknown>;

/**
 * Evaluate a scope-init expression and return an object to merge into the scope.
 *
 * Supported inputs:
 * - JSON string: '{"name":"John","repeatCount":3}'
 * - DOM expression returning a JSON string: document.querySelector('#seed')!.innerHTML
 * - Async expression with fetch: await fetch('/api').then(r => r.json())
 *
 * Context available to the expression:
 * - window, document, fetch, scope (current scope proxy)
 */
export async function evaluateScopeInitExpression(
  host: HTMLElement,
  expr: string,
  scope: ScopeDefinition
): Promise<ScopeInitObject> {
  const src = (expr ?? '').trim();
  if (!src) return {};

  // Fast-path: looks like JSON
  if ((src.startsWith('{') && src.endsWith('}')) || (src.startsWith('[') && src.endsWith(']'))) {
    const parsed = tryParseJson<ScopeInitObject>(src);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  // Evaluate as async expression
  const fn = new Function(
    'window',
    'document',
    'fetch',
    'scope',
    `
      "use strict";
      return (async () => {
        return (${src});
      })();
    `
  ) as (w: Window, d: Document, f: typeof fetch, s: ScopeDefinition) => Promise<unknown>;

  let result: unknown;
  try {
    // In JSDOM tests, global fetch is available; bind to window for consistency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const boundFetch = (host.ownerDocument?.defaultView?.fetch ?? (fetch as any)).bind(
      host.ownerDocument?.defaultView ?? window
    );
    result = await fn(
      host.ownerDocument?.defaultView ?? window,
      host.ownerDocument ?? document,
      boundFetch,
      scope
    );
  } catch {
    return {};
  }

  if (typeof result === 'string') {
    const parsed = tryParseJson<ScopeInitObject>(result);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  if (result !== null && typeof result === 'object') {
    return result as ScopeInitObject;
  }

  return {};
}
```

### ./src/utils/scope-init.spec.ts

Create new tests for the 3 scenarios.

```typescript
// src/utils/scope-init.spec.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateScopeInitExpression } from './scope-init';
import { scopeDefine } from '@trunkjs/template';
import { create_element } from '@trunkjs/browser-utils';

describe('evaluateScopeInitExpression', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = create_element('div', {}) as HTMLElement;
    document.body.appendChild(host);
  });

  it('parses direct JSON string', async () => {
    const scope = scopeDefine({});
    const expr = '{"name":"Json","repeatCount":2}';
    const res = await evaluateScopeInitExpression(host, expr, scope);
    expect(res).toEqual({ name: 'Json', repeatCount: 2 });
  });

  it('evaluates DOM expression returning JSON string', async () => {
    const scope = scopeDefine({});
    const seed = create_element('div', { id: 'seed' }, JSON.stringify({ name: 'Dom', repeatCount: 4 }));
    document.body.appendChild(seed);

    const expr = "document.querySelector('#seed').innerHTML";
    const res = await evaluateScopeInitExpression(host, expr, scope);
    expect(res).toEqual({ name: 'Dom', repeatCount: 4 });
  });

  it('supports async fetch expression', async () => {
    const scope = scopeDefine({});

    // Mock fetch to return JSON
    globalThis.fetch = vi.fn(async () => {
      return {
        json: async () => ({ name: 'Remote', repeatCount: 5 }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const expr = "await fetch('/api/data').then(r => r.json())";
    const res = await evaluateScopeInitExpression(host, expr, scope);
    expect(res).toEqual({ name: 'Remote', repeatCount: 5 });
  });
});
```

### ./src/components/tj-html-scope/tj-html-scope.ts

Edit to integrate scope-init.

**Imports: add PropertyValues and utility**

Replace
```typescript
import { ReactiveElement } from 'lit';
```
by
```typescript
import { ReactiveElement, PropertyValues } from 'lit';
```

Add
```typescript
import { evaluateScopeInitExpression } from '../../utils/scope-init';
```
to the imports.

**Add new property and initializer method inside class**

Insert after updateOn property:
```typescript
  @property({ type: String, reflect: true, attribute: 'scope-init' })
  public scopeInit?: string;
```

Add a private initializer method in class:
```typescript
  private async _initializeScopeFromInit() {
    if (!this.scopeInit || this.scopeInit.trim() === '') return;
    try {
      const obj = await evaluateScopeInitExpression(this, this.scopeInit, this.$scope);
      Object.assign(this.$scope, obj);
      this.dispatchEvent(new CustomEvent('scope-update'));
    } catch (e) {
      this.log?.('scope-init evaluation failed', e);
    }
  }
```

**Update lifecycle hooks**

Replace the whole updated() with:

```typescript
  override updated(changed?: PropertyValues) {
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

    if (changed?.has?.('scopeInit')) {
      // Re-evaluate when attribute changes
      this._initializeScopeFromInit().then(() => this._renderTemplates());
    }
  }
```

Replace connectedCallback() with:

```typescript
  override connectedCallback() {
    super.connectedCallback();
    this.log('Connected', this.$scope);
    // Initialize from scope-init first (async), then collect inputs and render
    this._initializeScopeFromInit()
      .catch(() => void 0)
      .finally(() => {
        this._updateScope();
        this._renderTemplates();
      });
  }
```

Full file context with insertions (abbreviated where unchanged):

```typescript
import { create_element, LoggingMixin } from '@trunkjs/browser-utils';
import { scopeDefine, ScopeDefinition, Template } from '@trunkjs/template';
import { ReactiveElement, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { evaluateScopeInitExpression } from '../../utils/scope-init';

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
    return this;
  }

  private _renderTemplates() {
    ...original content...
  }

  private _updateScope() {
    ...original content...
  }

  private async _initializeScopeFromInit() {
    if (!this.scopeInit || this.scopeInit.trim() === '') return;
    try {
      const obj = await evaluateScopeInitExpression(this, this.scopeInit, this.$scope);
      Object.assign(this.$scope, obj);
      this.dispatchEvent(new CustomEvent('scope-update'));
    } catch (e) {
      this.log?.('scope-init evaluation failed', e);
    }
  }

  override updated(changed?: PropertyValues) {
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

    if (changed?.has?.('scopeInit')) {
      this._initializeScopeFromInit().then(() => this._renderTemplates());
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.log('Connected', this.$scope);
    this._initializeScopeFromInit()
      .catch(() => void 0)
      .finally(() => {
        this._updateScope();
        this._renderTemplates();
      });
  }
}

declare global {
  ...original content...
}
```

### ./vite.config.ts

Set test environment to jsdom.

Replace
```ts
environment: 'node',
```
by
```ts
environment: 'jsdom',
```

### ./web-types.json

Add scope-init attribute to element metadata.

Insert into attributes array:

```json
{
  "name": "scope-init",
  "type": "string",
  "description": "Initialize component scope by evaluating a JSON/JS expression (supports await fetch, DOM access)."
}
```

Resulting attributes list (abbreviated):

```json
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
      "description": "Initialize component scope by evaluating a JSON/JS expression (supports await fetch, DOM access)."
    }
  ]
}
```

### ./README.md

Update documentation with feature description and examples.

Replace entire content with:

```markdown
# html-scope

Add reactive "scope" to plain HTML with templates powered by @trunkjs/template.

- [Usage](./README/100-usage.md)

## Quick start

```html
<tj-html-scope
  update-on="change keyup"
  scope-init='{"name":"World","repeatCount":3}'
>
  <template>
    <div *for="i of Array.from({ length: repeatCount })">Hello {{name}}</div>
  </template>

  <input type="text" name="name" value="World" />
  <input type="number" name="repeatCount" value="3" />
</tj-html-scope>
```

## scope-init

Scope initialization via attribute. The string is evaluated inside an async context with access to window, document, fetch and scope (current scope).

Examples:

- JSON
  ```html
  <tj-html-scope scope-init='{"name":"Jane","repeatCount":2}'></tj-html-scope>
  ```

- From DOM
  ```html
  <script id="seed" type="application/json">{"name":"Dom","repeatCount":4}</script>
  <tj-html-scope scope-init="document.querySelector('#seed').innerHTML"></tj-html-scope>
  ```

- Remote (async)
  ```html
  <tj-html-scope scope-init="await fetch('/api/scope').then(r => r.json())"></tj-html-scope>
  ```

Security note: scope-init executes a string as code. Do not pass untrusted input.

## Building

Run `nx build html-scope` to build the library.

## Running unit tests

Run `nx test html-scope` to execute the unit tests via Vitest (jsdom env).
```

### ./src/index.ts

No functional change needed. Optional: export util for consumers; we keep internal usage only, so no change required.

No changes required to the dummy lib html-scope files.

## Notes

- The evaluation preserves the existing scope proxy by merging the initialization result into this.$scope (Object.assign), ensuring reactivity.
- After initialization or attribute changes, a 'scope-update' event is dispatched and templates re-render.

## Example prompts to improve the original request

- Should non-object results from scope-init be ignored or wrapped (e.g., { value: <result> })?
- Should evaluation errors throw, warn, or be silently ignored?
- Do we need a CSP-friendly alternative to string evaluation?