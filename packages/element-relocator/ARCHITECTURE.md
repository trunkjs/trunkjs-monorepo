# Element Relocator architecture

## Purpose

`@trunkjs/element-relocator` provides the `<tj-element-relocator>` custom element for temporarily moving an existing DOM element and restoring it to its exact original position afterwards.

The package deliberately contains no breakpoint logic. Responsive behavior is expressed by another mechanism, normally `@trunkjs/responsive`, which adds or removes the plain `relocated` class on the relocator.

## State contract

The element observes `class`, `source`, and `placement`.

- Without `relocated`, the source stays at its original position.
- With `relocated`, the element selected by `source` is moved to the relocator.
- Removing `relocated` restores the source to its exact original DOM position.

Before the first move, the relocator inserts a private comment anchor at the source position. Restoration uses that anchor instead of remembering an index, so sibling changes that happen while the source is relocated do not invalidate the original return point.

## Placement

`placement` defines the destination relative to `<tj-element-relocator>`:

- `inside` (default): append the source as a child of the relocator.
- `before`: insert the source immediately before the relocator.
- `after`: insert the source immediately after the relocator.

`before` and `after` exist primarily for light-DOM and slot scenarios. The relocated source remains a sibling in the relocator's parent and can therefore continue to participate in slot assignment of the surrounding Web Component.

## Class invariant

The only supported plain class on `<tj-element-relocator>` is `relocated`. Classes containing `:` are accepted because they may represent responsive expressions that eventually resolve to `relocated`.

Any other class without `:` produces a developer warning but does not throw or disable relocation.

## Boundaries

`source` is a CSS selector for the element being moved; the relocator itself is the destination. The package must stay independent from `@trunkjs/responsive` and must not add resize listeners, media-query handling, or breakpoint configuration of its own.

`ARCHITECTURE.md` is maintainer documentation. Package-local skills are consumer/agent documentation and should be included in the published build, while this file should not be copied to `dist`.
