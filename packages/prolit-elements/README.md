# @trunkjs/prolit-elements

Optional Lit integration and the existing HTML components. Use `prolit(scope, fallback?)` from `@trunkjs/prolit` directly when a component already provides the desired content point. This package adds `withProlitLightDom(Base)` when one Lit host needs both a shadow renderer and a separate scope-rendered light-DOM area.

## 01 Two roots, two scopes

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

The shadow root owns the heading and slot. The light DOM contains the name and button. The mixin appends one `<div data-prolit-light style="display: contents">`, renders `prolit(lightScope)` there, and preserves existing host children. A slot projects that content; it does not move its nodes.

The inherited `lightScope` property is reactive. Replace it to switch scopes, or set it to `undefined` to clear managed content. Scope changes update their own part without rerendering the outer host. Base constructors, public types, reactive properties and lifecycle calls are preserved. `updateComplete` includes synchronous commits to both roots, not pending service calls.

The directive alone runs `$connect`/cleanup. The mixin forwards disconnect/reconnect to its light RootPart and calls the base lifecycle. It requires a separate shadow root: `renderRoot === this` rejects the host update before mounting a competing renderer. The wrapper also means loose table rows and named slots need a deliberately chosen direct insertion point.

## 02 One light-DOM root or existing dialog

For a light-only component, extend `LitElement`, return `this` from `createRenderRoot()`, and return `` html`${prolit(this.lightScope)}` `` from `render()`. For existing panels or dialogs, put the directive into their existing Lit content slot. Neither case needs the mixin or a Prolit-specific replacement element.

`ProlitAware` and the opaque `ProlitScope` **type** belong to `@trunkjs/prolit`. The existing `ProlitScope` **element class** in this package is different. An optional Nextrap-specific base belongs in a Nextrap integration package. TrunkJS imports no Nextrap runtime code, public types or reexports; the Nextrap adapter in the [design examples](proposals/examples/README.md) remains a proposal.

See the [core README](../prolit/README.md) for resources, actions, error handling, manual roots and precise scope types. A technical failure never silently becomes the optional content fallback.

## 03 Existing HTML entry points

Importing `@trunkjs/prolit-elements` also registers the existing `prolit-scope` and `tj-include` components.

```html
<prolit-scope init='{ "name": "Ada" }'>
  <template><p>Hello {{ name }}</p></template>
</prolit-scope>
```

The legacy `prolit-scope` supports inline/external templates, `init`, `src`, named-input synchronization and `import-src` includes. It is not the new directive/mixin lifecycle and has not been migrated by this change. Its existing listener/reload/input limitations are recorded in [the baseline analysis](proposals/2026-09-12-prolit-elements-frontentwurf.md#-22-konkrete-lücken-vor-einer-stabilen-api). Prefer the explicit TypeScript scope API for new application components. HTML parsed by the browser loses repeated attributes of the same name; use nested elements for repeated structural directives. Templates and `init` are executable trusted application code.

## Verification

From the monorepo root: `npx nx test prolit-elements` and `npx nx build prolit-elements`. Unit tests cover independent roots, preserved host behavior, reactive replacement, cleanup/reconnect, root conflicts and public mixin types. Nextrap browser behavior and application services are outside these package tests.
