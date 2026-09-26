# @trunkjs/prolit-elements

`ProlitElement` is an optional Lit base for one Prolit scope with lifecycle-aware event listeners. `prolit(scope, fallback?)` from `@trunkjs/prolit` remains the direct integration point for existing Lit elements, dialogs, and other content slots. This package also provides the older HTML elements and `withProlitLightDom` for a host with two separate render roots.

## 01 A working counter in shadow DOM

```ts
import { prolit_html, scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';

class UserCounter extends ProlitElement {
  readonly state = scopeDefine({
    count: 0,
    $tpl: prolit_html`
      <button @click="count++">Clicks: {{ count }}</button>
    `,
  });

  constructor() {
    super();
    this.scope = this.state;
  }
}

customElements.define('user-counter', UserCounter);
document.body.append(document.createElement('user-counter'));
```

The button starts at `Clicks: 0`; clicking it changes the scope and shows `Clicks: 1`. Each element owns a separate scope instance. The inherited `scope` property is reactive, accepts `undefined` to clear the managed content, and is not an HTML attribute. Keep `state` for inferred TypeScript access to its fields: the public `scope` handoff is intentionally typed as the opaque `ProlitScope`. The Prolit directive handles updates, `$connect` and cleanup, and emits `scope-error` for technical failures.

## 02 Render the same scope in light DOM

This independent alternative replaces only the root selection of the previous class; its constructor and scope definition can remain the same:

```ts
class LightCounter extends ProlitElement {
  readonly state = scopeDefine({
    count: 0,
    $tpl: prolit_html`<button @click="count++">Clicks: {{ count }}</button>`,
  });

  constructor() {
    super();
    this.scope = this.state;
  }

  protected override createRenderRoot() {
    return this;
  }
}

customElements.define('light-counter', LightCounter);
document.body.append(document.createElement('light-counter'));
```

`<light-counter>` now contains the button directly; it has no shadow root. Its content follows the page's CSS. Lit owns this single light root, so do not combine this variant with `withProlitLightDom`, which requires a separate shadow root. As with any Lit light-DOM renderer, do not place unmanaged children in its render area if they must survive an update.

## 03 Listen to application events

Add the following to `UserCounter` from 01. `on()` is available directly from `ProlitElement` because it includes Browser Utils' `EventBindingsMixin`:

```ts
// Inside UserCounter's constructor, after super() and scope assignment:
this.on('counter:reset', () => { this.state.count = 0; }, { target: 'document' });

// In the application, after creating the element:
document.dispatchEvent(new Event('counter:reset'));
// The displayed value is now Clicks: 0.
```

Registration in a constructor is saved until the element connects; it stops listening during a disconnect and resumes on reconnect. A late call on an already connected element attaches immediately. `on()` returns `off()`, which permanently unregisters that one callback. For a callback target inside the rendered DOM, register after `updateComplete` and supply `{ target: host => host.shadowRoot!.querySelector('button')! }`; the target is resolved again on reconnect. Use the Prolit `@click` expression for actions within a scope template, and `on()` for external browser/application events.

For method-based handlers, `@Listen` uses the same lifecycle and can coexist with `on()`:

```ts
import { Listen } from '@trunkjs/browser-utils';

class ResettableCounter extends ProlitElement {
  readonly state = scopeDefine({ count: 0, $tpl: prolit_html`<p>{{ count }}</p>` });
  constructor() {
    super();
    this.scope = this.state;
  }

  @Listen('counter:reset', { target: 'document' })
  reset(): void {
    this.state.count = 0;
  }
}
customElements.define('resettable-counter', ResettableCounter);
```

`@Listen` requires the event mixin, already present in `ProlitElement`. Browser Utils also exports `EventBindingsMixin` for other custom elements. See its [event reference](../browser-utils/skills/browser-utils-usage/references/custom-elements-and-mixins.md) for target options, explicit `off()` and typed custom events.

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
