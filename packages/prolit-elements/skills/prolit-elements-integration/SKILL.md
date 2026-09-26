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
- `ProlitAware` and the opaque `ProlitScope` type come from the core; keep an inferred local scope field for typed callbacks and assign it to the host's `scope`. The legacy `ProlitScope` element class here is different and has not been migrated to the new lifecycle.
- `ProlitElement` includes only EventBindingsMixin. LoggingMixin, LoaderMixin, SlotVisibilityMixin and BreakPointMixin are optional and should be composed only for their respective application use. The loader signals the first Lit update, not an asynchronous scope resource's completion.
- See README 01–03 for a full counter, light-DOM alternative, programmatic `on()` and `@Listen` examples.
- Nextrap-specific bases belong to an optional Nextrap integration package. No Nextrap dependency, type import or reexport belongs in TrunkJS. Existing dialogs can insert the directive directly.
