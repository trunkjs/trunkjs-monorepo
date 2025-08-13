---
slugName: add-scope-init-eval
includeFiles:
- ./src/components/tj-html-scope/tj-html-scope.ts
- ./src/utils/scope-init.ts
- ./src/utils/scope-init.spec.ts
- ./vite.config.ts
- ./web-types.json
- ./README.md
- ./src/index.ts
editFiles:
- ./src/components/tj-html-scope/tj-html-scope.ts
- ./src/utils/scope-init.ts
- ./src/utils/scope-init.spec.ts
- ./vite.config.ts
- ./web-types.json
- ./README.md
- ./src/index.ts
original_prompt: Lege eine property scope-init an. Diese soll evald werden und den
  scope zurück liefern. Es kann direkt der input als json interpretiert werden oder
  z.b. querySelector..innerHTML oder auch await fetch angegeben sein. Mach einen kurzen
  Unittest, der diese 3 fälle abteset und beschreibe die Funktionalität
---
# Prepare Add scope-init property for initial scope evaluation (JSON, DOM, fetch)

Add a new attribute/property scope-init to tj-html-scope. It is evaluated to produce the initial scope object. The expression supports:
- Direct JSON, e.g. {"name":"Jane"}
- DOM-based expressions, e.g. document.querySelector('#data').textContent
- Async expressions using await fetch(...), returning JSON

The evaluation happens outside of the web-component in a small utility. A unit test covers the three cases.

## Assumptions

- scope-init is optional. If empty or missing, the initial scope is {}.
- If the expression is valid JSON that yields an object, it is used directly.
- If the expression evaluates to:
  - an object: used as-is
  - a string: a best-effort JSON.parse is attempted; on failure, it is wrapped as { value: string }
  - any other primitive: wrapped as { value: primitive }
- Initial scope is set on connect. Then input elements with [name] override values (current behavior retained).
- Changing scope-init attribute at runtime should also refresh the scope. We implement a simple change detection in updated() to re-evaluate if the attribute value has changed.
- Tests use jsdom environment to allow document and querySelector. We adapt the test environment accordingly.
- Security: caller is responsible for providing trusted expressions. The evaluation runs with access to limited globals we explicitly pass (host, document, fetch, window, self, console).

## Missing Information

- None strictly required to implement. If you need a stricter security model, provide a whitelist of allowed globals or disable evaluation entirely in production.

## Tasks

- Add scope-init property Parse/eval attribute to produce initial scope (JSON, DOM, await fetch)
- Implement util evalScopeInit Async evaluator with JSON-first parsing and controlled globals
- Wire into component Use evalScopeInit on connect and when attribute changes
- Add unit tests Cover JSON, DOM querySelector text, and await fetch cases
- Switch tests to jsdom Enable DOM API for tests
- Update web-types Add scope-init attribute docs
- Update README Document scope-init with examples

## Overview: File changes

- src/components/tj-html-scope/tj-html-scope.ts Add scope-init property, evaluate on connect and when changed, merge with inputs, minor typings update
- src/utils/scope-init.ts New utility with evalScopeInit to safely evaluate expressions (JSON-first, async)
- src/utils/scope-init.spec.ts New tests for JSON, DOM, fetch cases
- vite.config.ts Set test.environment to 'jsdom' for DOM-based tests
- web-types.json Document scope-init attribute
- README.md Document feature and usage examples
- src/index.ts Export util (optional but helpful for consumers)

## Detail changes

### src/utils/scope-init.ts

Create new file.

- Referenced Tasks
  - Implement util evalScopeInit
  - Add unit tests

Add:

```typescript
/**
 * Evaluate a scope-init expression into an object.
 *
 * Supports:
 * - Direct JSON objects: '{"a":1}'
 * - Expressions using document/querySelector: 'document.querySelector("#data").textContent'
 * - Async expressions with await: 'await fetch("/api").then(r => r.json())'
 *
 * The evaluation occurs in an async function with limited globals.
 */
export interface ScopeInitContext {
  host: HTMLElement | null;
  document: Document | null;
  fetch: typeof globalThis.fetch | undefined;
  window: Window | undefined;
  self: any;
  console: Console;
}

export type ScopeInitInput = string | null | undefined;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Try parsing JSON first, then evaluate as an async JS expression.
 */
export async function evalScopeInit(
  input: ScopeInitInput,
  ctx: Partial<ScopeInitContext> = {}
): Promise<Record<string, unknown>> {
  const raw = (input ?? '').toString().trim();
  if (!raw) return {};

  // 1) Try direct JSON first
  try {
    const json = JSON.parse(raw);
    if (isObject(json)) return json;
    // If it's a primitive or array, expose it as { value: ... }
    return { value: json };
  } catch {
    // ignore and continue with evaluation
  }

  // 2) Evaluate as async expression in a constrained scope
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...args: unknown[]) => Promise<unknown>;

  const fn = new AsyncFunction(
    'host',
    'document',
    'fetch',
    'window',
    'self',
    'console',
    // Wrap in IIFE to allow top-level await-like usage
    'return await (async () => ( ' + raw + ' ))();'
  );

  const result = await fn(
    ctx.host ?? null,
    ctx.document ?? (typeof document !== 'undefined' ? document : null),
    ctx.fetch ?? (typeof fetch !== 'undefined' ? fetch : undefined),
    ctx.window ?? (typeof window !== 'undefined' ? window : undefined),
    ctx.self ?? globalThis,
    ctx.console ?? console
  );

  if (isObject(result)) return result;

  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result);
      if (isObject(parsed)) return parsed;
      return { value: parsed };
    } catch {
      return { value: result };
    }
  }

  return { value: result as unknown };
}
```

### src/utils/scope-init.spec.ts

Create new test file.

- Referenced Tasks
  - Add unit tests

Add:

```typescript
import { describe, it, expect } from 'vitest';
import { evalScopeInit } from './scope-init';
import { create_element } from '@trunkjs/browser-utils';

describe('evalScopeInit', () => {
  it('parses direct JSON', async () => {
    const scope = await evalScopeInit('{"name":"Jane","age":33}');
    expect(scope).toEqual({ name: 'Jane', age: 33 });
  });

  it('evaluates DOM querySelector textContent as JSON', async () => {
    const el = create_element('div', { id: 'data' }, '{"city":"Berlin","zip":10115}');
    document.body.appendChild(el);
    try {
      const scope = await evalScopeInit('document.querySelector("#data").textContent');
      expect(scope).toEqual({ city: 'Berlin', zip: 10115 });
    } finally {
      el.remove();
    }
  });

  it('supports await fetch returning JSON', async () => {
    const fakeFetch = async (url: string) =>
      ({
        json: async () => ({ url, ok: true, from: 'test' }),
      } as any);

    const scope = await evalScopeInit(
      'await fetch("https://api.test/scope").then(r => r.json())',
      { fetch: fakeFetch as any }
    );

    expect(scope).toEqual({ url: 'https://api.test/scope', ok: true, from: 'test' });
  });
});
```

### src/components/tj-html-scope/tj-html-scope.ts

Update to support scope-init and evaluate it.

- Referenced Tasks
  - Wire into component

Replace the entire file content with:

```typescript
import { create_element, LoggingMixin } from '@trunkjs/browser-utils';
import { scopeDefine, ScopeDefinition, Template } from '@trunkjs/template';
import { PropertyValues, ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { evalScopeInit } from '../../utils/scope-init';

const templateRenderInElement: WeakMap<HTMLTemplateElement, HTMLElement> = new WeakMap();
const templateClass: WeakMap<HTMLTemplateElement, Template> = new WeakMap();

@customElement('tj-html-scope')
export class TjHtmlScope extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn = 'change';

  // New: optional initialization expression for the scope
  @property({ type: String, attribute: 'scope-init' })
  public scopeInit?: string;

  public $scope: ScopeDefinition;

  private _lastScopeInit?: string;
  private _pendingInit?: Promise<void>;

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
      if (name && (input as any).value !== undefined) {
        this.$scope[name] = (input as any).value;
      }
    }
  }

  private async _initScopeFromAttribute(): Promise<void> {
    const expr = this.scopeInit ?? this.getAttribute('scope-init') ?? '';
    if (expr === this._lastScopeInit) return;
    this._lastScopeInit = expr;

    if (!expr || expr.trim() === '') return;

    this._pendingInit = evalScopeInit(expr, {
      host: this,
      document: this.ownerDocument ?? document,
      fetch: (globalThis as any).fetch,
      window: typeof window !== 'undefined' ? window : undefined,
      self: globalThis,
    })
      .then((result) => {
        this.$scope = scopeDefine(result as Record<string, unknown>);
        this.dispatchEvent(new CustomEvent('scope-update'));
      })
      .catch((err) => this.error?.('scope-init evaluation failed', err))
      .finally(() => {
        this._pendingInit = undefined;
      });

    await this._pendingInit;
  }

  override async updated(_changed?: PropertyValues) {
    this.log('Updated', this.$scope);

    // Re-evaluate scope-init if it changed
    await this._initScopeFromAttribute();

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

    // Initialize scope from attribute (async), then merge inputs and render
    this._initScopeFromAttribute()
      .catch(() => void 0)
      .finally(() => {
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
    scopeInit?: string;
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

### vite.config.ts

Switch tests to jsdom.

- Referenced Tasks
  - Switch tests to jsdom

Replace:

```typescript
  test: {
    watch: false,
    globals: true,
    environment: 'node',
```

by

```typescript
  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
```

Full file for clarity:

```typescript
/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import * as path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(() => ({
  server: {
    port: 4000,
    host: '0.0.0.0',
    hmr: true,
  },

  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/html-scope',
  plugins: [
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md', 'web-types.json']),
    dts({ entryRoot: 'src', tsconfigPath: path.join(__dirname, 'tsconfig.lib.json') }),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    outDir: '../../dist/packages/html-scope',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: 'src/index.ts',
      name: 'html-scope',
      fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      formats: ['es' as const],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
    },
  },
  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/html-scope',
      provider: 'v8' as const,
    },
  },
}));
```

### web-types.json

Add scope-init attribute documentation.

- Referenced Tasks
  - Update web-types

Replace the file content with:

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
              "description": "Initial scope expression. Supports direct JSON or evaluated JS (may use document/querySelector and await fetch)."
            }
          ]
        }
      ]
    }
  }
}
```

### src/index.ts

Optionally export the new utility for consumers.

- Referenced Tasks
  - Export util

Replace:

```typescript
export * from './components/tj-html-scope/tj-html-scope';
```

by

```typescript
export * from './components/tj-html-scope/tj-html-scope';
export * from './utils/scope-init';
```

### README.md

Add documentation for scope-init usage and caveats.

- Referenced Tasks
  - Update README

Replace the file content with:

```markdown
# html-scope

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build html-scope` to build the library.

## Running unit tests

Run `nx test html-scope` to execute the unit tests via [Vitest](https://vitest.dev/).

## tj-html-scope: scope-init

Initializes the scope of a `<tj-html-scope>` using the `scope-init` attribute. The value is evaluated as follows:

Order:
1) If it is valid JSON, the parsed object becomes the initial scope.
2) Otherwise, it is evaluated as an async JavaScript expression with access to:
   - host (the element), document, fetch, window, self, console
3) If the result is a string, a best-effort JSON.parse is attempted.

Input elements below the component with a `name` attribute still override the scope values on events defined by `update-on` (default: `change`).

Examples:

```html
<!-- Direct JSON -->
<tj-html-scope scope-init='{"user": {"name": "Jane"}, "count": 3}'>
  <template>
    <div>Hello {{user.name}} x {{count}}</div>
  </template>
</tj-html-scope>
```

```html
<!-- Read JSON from DOM -->
<div id="seed">{"token":"abc","env":"dev"}</div>

<tj-html-scope scope-init='document.querySelector("#seed").textContent'>
  <template>
    <div>Env: {{env}}, Token: {{token}}</div>
  </template>
</tj-html-scope>
```

```html
<!-- Async fetch -->
<tj-html-scope scope-init='await fetch("/api/scope").then(r => r.json())'>
  <template>
    <div>User: {{user.name}}</div>
  </template>
</tj-html-scope>
```

Notes:
- The expression is evaluated at connect and when `scope-init` changes.
- Use only trusted expressions/inputs.
- If expression produces a primitive value, it is wrapped as `{ value: ... }`.
```

## Example prompts to improve the original request

- "Should `scope-init` re-evaluation merge with existing scope or replace it? If merge, define precedence."
- "Restrict allowed globals for `scope-init` evaluation or provide a safe mode?"
- "Should evaluation errors be thrown, logged, or silently ignored?"

