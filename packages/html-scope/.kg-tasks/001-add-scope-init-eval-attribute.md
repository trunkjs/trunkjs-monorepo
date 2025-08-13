---
slugName: add-scope-init-eval-attribute
includeFiles:
- ./src/components/tj-html-scope/tj-html-scope.ts
- ./src/lib/html-scope.spec.ts
- ./src/index.ts
- ./tsconfig.spec.json
- ./vite.config.ts
- ./README.md
- ./index.html
editFiles:
- ./src/components/tj-html-scope/tj-html-scope.ts
- ./src/lib/html-scope.spec.ts
- ./README.md
original_prompt: Lege eine property scope-init an. Diese soll evald werden und den
  scope zurück liefern. Es kann direkt der input als json interpretiert werden oder
  z.b. querySelector..innerHTML oder auch await fetch angegeben sein. Mach einen kurzen
  Unittest, der diese 3 fälle abteset und beschreibe die Funktionalität
---
# Prepare Add scope-init property for initial scope evaluation

Add a new attribute/property scope-init to tj-html-scope. When present, it will be evaluated and its result will initialize/merge into the component’s $scope. The expression can be:
- Raw JSON (parsed directly).
- Any JS expression, e.g. document.querySelector(...).innerHTML (string results will be parsed as JSON if applicable).
- An async expression using await (e.g., await fetch(...).then(r => r.json())).

Also add a short unit test to cover the 3 cases and document the feature in README.

## Assumptions

- Evaluation runs once on connectedCallback, and again whenever the scope-init property/attribute changes.
- The evaluated result should be an object representing the scope. If a string is returned and it looks like JSON, it is parsed into an object.
- If evaluation yields a Response-like object with a json()/text() method, it will be read accordingly and parsed to JSON when possible.
- The resulting object is shallow-merged into the current scope (later keys overwrite existing ones).
- After initializing from scope-init, templates will render and a scope-update event is dispatched.
- Security: Evaluating arbitrary expressions is dangerous. This is opt-in via attribute and must be used in trusted contexts (documented in README).

## Tasks

- Add property scope-init and evaluator Add a reactive attribute to tj-html-scope and evaluate it async to initialize scope
- Trigger and re-render Ensure scope update merges values, dispatches scope-update, and renders templates
- Unit tests Add 3 tests: direct JSON, querySelector innerHTML JSON, and await fetch JSON
- Documentation Update README with usage, examples, caveats, and events

## Overview: File changes

- ./src/components/tj-html-scope/tj-html-scope.ts Add scope-init property, async evaluator, integration in lifecycle, event dispatch
- ./src/lib/html-scope.spec.ts Replace trivial test with jsdom-based tests for the 3 scenarios
- ./README.md Document scope-init with examples and security caveats

## Detail changes

### ./src/components/tj-html-scope/tj-html-scope.ts

Referenced Tasks
- Add property scope-init and evaluator Add attribute and evaluation helpers
- Trigger and re-render Merge into scope, fire event, render templates

Insert new property below updateOn:

```typescript
  @property({ type: String, reflect: true, attribute: 'scope-init' })
  public scopeInit?: string;
```

Insert a private async evaluator and initializer into the class (place below _renderTemplates and before updated):

```typescript
  /**
   * Evaluate the scope-init expression (if provided) and merge into $scope.
   * Supports:
   * - Raw JSON strings ("{...}" or "[...]")
   * - Expressions (sync/async). If returns string, attempts JSON.parse.
   * - Response-like objects (prefers .json(), fallback .text()).
   */
  private async _initScopeFromAttribute(): Promise<void> {
    const expr = this.scopeInit?.trim();
    if (!expr) return;

    let result: unknown;

    // 1) Try to parse as JSON if it looks like JSON
    if ((expr.startsWith('{') && expr.endsWith('}')) || (expr.startsWith('[') && expr.endsWith(']'))) {
      try {
        result = JSON.parse(expr);
      } catch {
        // Fall through to evaluator
      }
    }

    // 2) Evaluate as expression if not JSON
    if (result === undefined) {
      try {
        // Expose some helpers to the evaluated expression:
        // qs: querySelector; qsa: querySelectorAll; el: this element
        const asyncEval = new Function(
          'qs',
          'qsa',
          'el',
          'document',
          'window',
          'scope',
          // Wrap as expression and support await
          `return (async () => (${expr}))();`,
        );
        result = await asyncEval(
          (sel: string, root: Document | Element = document) => (root as Document | Element).querySelector(sel),
          (sel: string, root: Document | Element = document) => Array.from((root as Document | Element).querySelectorAll(sel)),
          this,
          document,
          window,
          this.$scope,
        );
      } catch (e) {
        this.error?.('Failed to evaluate scope-init', e);
        return;
      }
    }

    // 3) If result is a Response-like, try to extract JSON/text
    if (result && typeof result === 'object' && ('json' in (result as any) || 'text' in (result as any))) {
      const resp = result as any;
      try {
        if (typeof resp.json === 'function') {
          result = await resp.json();
        } else if (typeof resp.text === 'function') {
          const text = await resp.text();
          try {
            result = JSON.parse(text);
          } catch {
            result = text;
          }
        }
      } catch (e) {
        this.error?.('Failed to read Response from scope-init', e);
        return;
      }
    }

    // 4) If result is a string, try to parse JSON
    if (typeof result === 'string') {
      const trimmed = result.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          result = JSON.parse(trimmed);
        } catch {
          // keep string if parsing fails
        }
      }
    }

    // 5) Merge object result into scope
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      this.$scope = scopeDefine({ ...this.$scope, ...(result as Record<string, unknown>) });
      // Dispatch update event and render
      this.dispatchEvent(new CustomEvent('scope-update'));
      this._renderTemplates();
    } else {
      this.log?.('scope-init did not yield an object. Ignored.', result);
    }
  }
```

Update connectedCallback to initialize from scope-init first (make it async call), then proceed:

Replace

```typescript
  override connectedCallback() {
    super.connectedCallback();
    this.log('Connected', this.$scope);
    this._updateScope();
    this._renderTemplates();
  }
```

by

```typescript
  override connectedCallback() {
    super.connectedCallback();
    this.log('Connected', this.$scope);
    // Initialize from scope-init first, then inputs and templates
    (async () => {
      await this._initScopeFromAttribute();
      this._updateScope();
      this._renderTemplates();
    })();
  }
```

React to attribute changes: re-evaluate when scope-init changes.

Insert willUpdate method (above updated()):

```typescript
  protected override async willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('scopeInit')) {
      await this._initScopeFromAttribute();
    }
  }
```

No other behavioral changes are needed. Existing updated() will continue to bind update listeners.

### ./src/lib/html-scope.spec.ts

Referenced Tasks
- Unit tests Add 3 tests: JSON, querySelector string JSON, await fetch JSON

Replace the entire file content with the following:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../../src/components/tj-html-scope/tj-html-scope';
import { create_element } from '@trunkjs/browser-utils';

function waitForEvent(el: Element, type: string): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      el.removeEventListener(type, handler as any);
      resolve();
    };
    el.addEventListener(type, handler as any, { once: true });
  });
}

describe('tj-html-scope scope-init', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes scope from direct JSON', async () => {
    const host = document.body.appendChild(create_element('div', {}));
    const el = document.createElement('tj-html-scope') as any;
    el.setAttribute('scope-init', '{"name":"Alice","count":2}');
    host.appendChild(el);

    await waitForEvent(el, 'scope-update');

    expect(el.$scope.name).toBe('Alice');
    expect(el.$scope.count).toBe(2);
  });

  it('initializes scope from querySelector innerHTML containing JSON', async () => {
    const host = document.body.appendChild(create_element('div', {}));
    // Provide JSON in DOM
    const data = create_element('div', { id: 'seed' }, '{"foo":"bar","n":7}');
    host.appendChild(data);

    const el = document.createElement('tj-html-scope') as any;
    // Expression returns a string; component will JSON.parse it
    el.setAttribute('scope-init', "document.querySelector('#seed').innerHTML");
    host.appendChild(el);

    await waitForEvent(el, 'scope-update');

    expect(el.$scope.foo).toBe('bar');
    expect(el.$scope.n).toBe(7);
  });

  it('initializes scope from async fetch expression', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ remote: true, answer: 42 }),
    });
    (globalThis as any).fetch = mockFetch;

    const el = document.createElement('tj-html-scope') as any;
    el.setAttribute('scope-init', "await fetch('/api').then(r => r.json())");
    document.body.appendChild(el);

    await waitForEvent(el, 'scope-update');

    expect(mockFetch).toHaveBeenCalledWith('/api');
    expect(el.$scope.remote).toBe(true);
    expect(el.$scope.answer).toBe(42);
  });
});
```

### ./README.md

Referenced Tasks
- Documentation Explain new attribute, examples, and caveats

Append and revise content as follows:

Replace current content with:

```markdown
# html-scope

This library was generated with Nx.

## Building

Run `nx build html-scope` to build the library.

## Running unit tests

Run `nx test html-scope` to execute the unit tests via Vitest.

## tj-html-scope

Add logic scope to the HTML elements below.

### New: scope-init

Initialize the component scope from a JSON string or an evaluated JS expression. Expressions may be async and can use `await`.

The evaluated value must yield an object that will be shallow-merged into the internal scope. If a string is returned and it looks like JSON, it is parsed.

- Direct JSON

```html
<tj-html-scope scope-init='{"name":"Alice","count":2}'>
  <template>
    Hello {{name}} ({{count}})
  </template>
</tj-html-scope>
```

- From DOM (string that contains JSON)

```html
<div id="seed">{"foo":"bar","n":7}</div>
<tj-html-scope scope-init="document.querySelector('#seed').innerHTML">
  <template>
    {{foo}} {{n}}
  </template>
</tj-html-scope>
```

- Async fetch

```html
<tj-html-scope scope-init="await fetch('/api/user').then(r => r.json())">
  <template>
    {{user.name}}
  </template>
</tj-html-scope>
```

Notes:
- On connect and whenever the `scope-init` attribute changes, the expression is evaluated and merged into `$scope`.
- After applying `scope-init`, a `scope-update` event is dispatched and templates are rendered.
- Inputs with `name` attributes inside the element still populate scope on configured events (via `update-on`), and can override initialized values.

Security:
- Evaluating arbitrary expressions is dangerous. Only use `scope-init` with trusted content and sources. Do not accept untrusted user input in this attribute.
```

## Example prompts to improve the original request

- Should the `scope-init` result replace or merge into the existing scope? If merge, should it be deep or shallow?
- When both `scope-init` and inputs provide the same key, which should take precedence?
- Should evaluation also run on a custom event or strictly on attribute change/connect?

```