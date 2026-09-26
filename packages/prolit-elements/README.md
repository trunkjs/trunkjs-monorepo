# @trunkjs/prolit-elements

`ProlitElement` is an optional Lit base for one Prolit scope with lifecycle-aware event listeners. `prolit(scope, fallback?)` from `@trunkjs/prolit` remains the direct integration point for existing Lit elements, dialogs, and other content slots. This package also provides the older HTML elements and `withProlitLightDom` for a host with two separate render roots.

## Examples: application flow, Router, API, events and template syntax

The [numbered example series](examples/README.md) includes separate TypeScript modules for a light-DOM task list with reflected attributes, API reads/writes, a declarative Router page, every EventBindings target, and Prolit's template directives. Run the gallery at `/examples/index.html?example=01` with `npx nx serve prolit-elements`. The API module documents its server contract; the other modules use local data. Start with 01 for a complete flow, then choose the specific question you need.

## 01 A working counter in shadow DOM

```ts
import { prolit_html as html, scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';

const template = html`<button @click="count++">Clicks: {{ count }}</button>`;

class UserCounter extends ProlitElement {
  override scope = scopeDefine({ count: 0, $tpl: template });
}

customElements.define('user-counter', UserCounter);
document.body.append(document.createElement('user-counter'));
```

The button starts at `Clicks: 0`; clicking it displays `Clicks: 1`. The class field creates a separate inferred, typed scope for each instance and initializes the inherited reactive `scope` property directly. The template constant is shared; `prolit_html as html` keeps Prolit's compiler while enabling editors that highlight `html` tagged templates. Editor support depends on configuration. The directive handles updates, `$connect`, cleanup and `scope-error` events.

## 02 Render the same scope in light DOM

This independent alternative changes only the render root:

```ts
class LightCounter extends ProlitElement {
  override scope = scopeDefine({ count: 0, $tpl: template });

  protected override createRenderRoot() {
    return this;
  }
}

customElements.define('light-counter', LightCounter);
document.body.append(document.createElement('light-counter'));
```

`template` is the constant from 01. The button appears directly under `<light-counter>`, follows page CSS and has no shadow root. Lit owns this single light root; avoid placing unrelated children there and do not combine it with `withProlitLightDom`, which requires a separate shadow root.

## 03 Listen to application events

This independent variant reuses `template` from 01. The constructor is needed for `on()` registration, not for assigning the scope:

```ts
class ResettableCounter extends ProlitElement {
  override scope = scopeDefine({ count: 0, $tpl: template });

  constructor() {
    super();
    this.on('counter:reset', () => { this.scope.count = 0; }, { target: 'document' });
  }
}

customElements.define('resettable-counter', ResettableCounter);
document.body.append(document.createElement('resettable-counter'));
document.dispatchEvent(new Event('counter:reset'));
```

The callback resets the displayed count to 0 when the event is dispatched after connection. The included `EventBindingsMixin` registers the callback when the element connects, removes its listener automatically on disconnect and attaches it once again on reconnect. A late `on()` call attaches immediately. The returned `off()` permanently removes that registration. Use `@click` within Prolit templates and `on()` for external browser or application events. Method decorators with `@Listen` have the same connection lifecycle; see the [event reference](../browser-utils/skills/browser-utils-usage/references/custom-elements-and-mixins.md).

## 04 Keep two independent roots

This is a separate variant for a host whose shadow root contains a frame while a second Prolit scope is rendered into a light-DOM container and projected through a slot:

```ts
import { html, LitElement } from 'lit';
import { prolit, prolit_html, scopeDefine, type ProlitScope } from '@trunkjs/prolit';
import { withProlitLightDom } from '@trunkjs/prolit-elements';

class UserWorkspace extends withProlitLightDom(LitElement) {
  readonly shadowScope = scopeDefine({
    title: 'Users',
    $tpl: prolit_html`<h1>{{ title }}</h1><slot></slot>`,
  });

  // Preserve the inherited reactive setter with either class-field emit mode.
  declare lightScope: ProlitScope;
  constructor() {
    super();
    const content = scopeDefine({
      name: 'Ada',
      $fn: { rename: (): void => { content.name = 'Ada Lovelace'; } },
      $tpl: prolit_html`
        <p>{{ name }}</p>
        <button @click="$fn.rename()">Rename</button>
      `,
    });
    this.lightScope = content;
  }

  protected override render() {
    return html`${prolit(this.shadowScope)}`;
  }
}
customElements.define('user-workspace', UserWorkspace);
document.body.append(document.createElement('user-workspace'));
```

The heading is in the shadow root, while the name and Rename button are in light DOM. The mixin appends one `<div data-prolit-light style="display: contents">` without removing existing children. Replacing `lightScope` switches content; `undefined` clears it. The directive owns the scope hooks; the mixin only manages the second root's connection. It rejects a light-only host before mounting a competing renderer. Loose table rows or named slots may require a direct insertion point instead of its wrapper.

## 05 Choose other Browser Utils mixins deliberately

`ProlitElement` includes only `EventBindingsMixin`. Combine `LoggingMixin` when the component needs element-scoped diagnostics, `LoaderMixin` when it participates in the TrunkJS visual loader, `SlotVisibilityMixin` when it renders `<slot>` elements whose empty state matters, and `BreakPointMixin` when it uses CSS `--breakpoint` to set a responsive mode. None is needed to make Prolit scopes reactive. Compose only the ones a component uses, for example `class LoadingCounter extends LoaderMixin(ProlitElement) { ... }`, and preserve superclass lifecycle calls in overrides. `LoaderMixin` signals the first Lit update, not completion of a scope's later asynchronous resource request.

The `ProlitAware` and opaque `ProlitScope` **types** come from `@trunkjs/prolit`. The older `ProlitScope` **element class** in this package is different. Nextrap-specific bases belong to a Nextrap integration package; TrunkJS has no Nextrap dependency.

## 06 Existing HTML entry points

Importing `@trunkjs/prolit-elements` also registers the existing `prolit-scope` and `tj-include` components:

```html
<prolit-scope init='{ "name": "Ada" }'>
  <template><p>Hello {{ name }}</p></template>
</prolit-scope>
```

The legacy `prolit-scope` supports inline/external templates, `init`, `src`, named-input synchronization and `import-src` includes. It has not been migrated to the directive lifecycle. Prefer `scopeDefine` and `ProlitElement` for new host components; use `prolit()` directly when an existing Lit host already has the right content point. Templates and `init` are trusted executable application code. See the [core README](../prolit/README.md) for resources, actions, errors and scope types.

## Verification

From the monorepo root: `npx nx test browser-utils`, `npx nx test prolit-elements`, `npx nx build browser-utils` and `npx nx build prolit-elements`. The package tests cover event connection and cleanup, scope replacement and both DOM modes. External application services and Nextrap browser behavior are outside these tests.
