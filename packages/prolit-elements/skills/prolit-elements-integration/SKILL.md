---
name: prolit-elements-integration
description: Integrate @trunkjs/prolit-elements with Lit hosts and choose direct insertion or the optional light-DOM mixin.
---

# Prolit element integration

- Prefer `prolit(scope, fallback?)` from `@trunkjs/prolit` at an existing Lit content point. For a new host that wants one scope and lifecycle-aware events, optionally extend `ProlitElement`. It uses Lit's shadow root by default and exposes the reactive `scope` property, `on()` and `@Listen`.
- For one light-DOM root, override `createRenderRoot()` in `ProlitElement` to return `this`; a normal LitElement with `html` and `prolit()` also remains available.
- Only use `withProlitLightDom(Base)` when a Lit host also needs a separate shadow root. It preserves the base API and owns one div container plus its light RootPart; the host still owns `render()` and its shadow tree.
- The inherited `lightScope` is reactive. Under native class-field semantics, use `declare` and assign in the constructor so the inherited setter is preserved. Prefer the inferred local scope for typed callbacks and assign it to the handoff property.
- Give shadow and light content separate scope instances. The shadow renderer needs a slot to project light content. Existing host children are preserved; loose table rows or named slots may need direct insertion instead of the mixin wrapper.
- The directive owns hooks and errors; the mixin only forwards root connection state. Do not invoke `$connect` or cleanup again in an adapter.
- `updateComplete` includes synchronous rendering of both roots, not requests. Scope mutations update the inserted content, not outer Lit expressions.
- `ProlitAware` and the opaque `ProlitScope` type come from the core. In a new `ProlitElement` class, initialize the inherited property directly with `override scope = scopeDefine({...})` for inferred field types and no handoff constructor; this package compiles with `useDefineForClassFields: false`. An editor-friendly external template can use `import { prolit_html as html }` and `const template = html\`...\``. Keep `declare lightScope` and constructor assignment for the separate `withProlitLightDom` mixin. The legacy `ProlitScope` element class here is different and has not been migrated to the new lifecycle.
- `ProlitElement` includes only EventBindingsMixin. LoggingMixin, LoaderMixin, SlotVisibilityMixin and BreakPointMixin are optional and should be composed only for their respective application use. The loader signals the first Lit update, not an asynchronous scope resource's completion.
- Read [the numbered examples](../../examples/README.md) for a complete Light-DOM component, attributes, Router, API resources/actions, event targets and Prolit template bindings. README 01–03 gives the minimal counter and event introduction.
- Nextrap-specific bases belong to an optional Nextrap integration package. No Nextrap dependency, type import or reexport belongs in TrunkJS. Existing dialogs can insert the directive directly.

- Use `ProlitDialogElement<Input, Result>` for a component that also supplies typed completion. Keep `override scope` instance-local; copy input in `onInput`, which runs before mounting. Inline results emit `prolit-dialog-result`; `show`/`open` results close and clean up a configured `DialogRenderer`. Do not resolve results or rerender scopes inside renderer adapters.
- Configure `createSimpleDialogRenderer()` once for a flat grey native dialog, or supply another `DialogRenderer`. The original element is slotted into the wrapper. Dimensions, preset size and dismissal options belong to `dialogOptions` or per-open overrides.
- Router integration is optional and structural: `router.setRenderer('dialog', createDialogRouteRenderer())`, plus `@route({ presentation: 'dialog', ... })`. Primary routes require `closeTo`; auxiliary decorators also use `auxiliary: true` and a named outlet. Closing replaces URL state, navigation disposes the presentation, and parameter changes update input on the same instance. See [example 07](../../examples/07-dialogs.md).
