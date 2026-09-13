---
name: prolit-elements-integration
description: Integrate @trunkjs/prolit-elements with Lit hosts and choose direct insertion or the optional light-DOM mixin.
---

# Prolit element integration

- Prefer `prolit(scope, fallback?)` from `@trunkjs/prolit` at the existing Lit content point. There is no required `ProlitElement` base.
- For one light-DOM root, use a normal LitElement returning `this` from `createRenderRoot()` and `html` wrapping the directive from `render()`.
- Only use `withProlitLightDom(Base)` when a Lit host also needs a separate shadow root. It preserves the base API and owns one div container plus its light RootPart; the host still owns `render()` and its shadow tree.
- The inherited `lightScope` is reactive. Under native class-field semantics, use `declare` and assign in the constructor so the inherited setter is preserved. Prefer the inferred local scope for typed callbacks and assign it to the handoff property.
- Give shadow and light content separate scope instances. The shadow renderer needs a slot to project light content. Existing host children are preserved; loose table rows or named slots may need direct insertion instead of the mixin wrapper.
- The directive owns hooks and errors; the mixin only forwards root connection state. Do not invoke `$connect` or cleanup again in an adapter.
- `updateComplete` includes synchronous rendering of both roots, not requests. Scope mutations update the inserted content, not outer Lit expressions.
- `ProlitAware` and the opaque `ProlitScope` type come from the core; the legacy `ProlitScope` element class here is different and has not been migrated to the new lifecycle.
- Nextrap-specific bases belong to an optional Nextrap integration package. No Nextrap dependency, type import or reexport belongs in TrunkJS. Existing dialogs can insert the directive directly.
