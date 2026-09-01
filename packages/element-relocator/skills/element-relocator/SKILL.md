---
name: element-relocator
description: Use @trunkjs/element-relocator when an existing DOM element must move to another responsive layout position and later return to its exact original position, including Web Component slot and light-DOM sibling scenarios.
---

# TrunkJS Element Relocator

Use `<tj-element-relocator>` to move an existing element identified by a CSS selector. The relocator does not implement breakpoints itself. Prefer `@trunkjs/responsive` to control when the plain `relocated` class is present.

## Basic usage

```html
<tj-responsive>
  <header>
    <nav id="navigation">...</nav>
  </header>

  <aside>
    <tj-element-relocator
      source="#navigation"
      class="md:relocated"
    ></tj-element-relocator>
  </aside>
</tj-responsive>
```

`source` identifies the element being moved. When the relocator has the plain `relocated` class, the source is moved. When `relocated` disappears, the source is restored to its exact original DOM position.

Do not implement separate resize listeners or breakpoint handling around the relocator when `@trunkjs/responsive` can express the condition.

## Placement

Use `placement` to choose where the source is inserted relative to the relocator:

- `inside` (default): the source becomes a child of `<tj-element-relocator>`.
- `before`: the source becomes its previous sibling.
- `after`: the source becomes its next sibling.

Prefer `inside` for ordinary DOM relocation. Use `before` or `after` when the source must remain in the surrounding component's light DOM, especially for slot assignment.

```html
<my-layout>
  <tj-element-relocator
    source="#actions"
    placement="after"
    class="md:relocated"
  ></tj-element-relocator>

  <div id="actions" slot="toolbar">...</div>
</my-layout>
```

The `slot` attribute remains on the source; sibling placement keeps it a direct light-DOM child of `<my-layout>`.

## Class contract

Treat the relocator's classes as control input, not as general styling classes.

The only supported plain class is `relocated`. Responsive expressions containing `:` are allowed, for example `md:relocated`. Do not add unrelated plain classes such as `hidden`, `toolbar`, or `mobile`; they produce a developer warning.

For implementation details and invariants, see [`ARCHITECTURE.md`](../../ARCHITECTURE.md).
