# Element Relocator architecture

## Purpose

`@trunkjs/element-relocator` provides `<tj-element-relocator>` for moving navigation items between two responsive navigation instances.

The package deliberately contains no breakpoint logic. Responsive behavior is expressed by another mechanism, normally `@trunkjs/responsive`, which adds or removes the plain `relocate` class.

## State contract

The element observes `class`, `source`, and `target`.

- Without `relocate`, the target is empty.
- With `relocate`, direct child elements of the source are moved into the target.
- The source is empty while relocation is active and the target contains the items.
- Removing `relocate` moves the items back to the source.
- Source child-list changes are moved while relocation is active.

`source` and `target` must resolve to different elements and must not contain one another. The target is a dedicated destination and its existing children are replaced by the synchronized copies.

## Navigation contract

The intended source and target are separate `nte-nav-2` elements. This allows the header to keep a horizontal navigation and the off-canvas to keep a vertical navigation. Moved `nte-nav-item` children retain their instances, nested items, attributes and light-DOM labels.

The package does not assign or transfer `slot` attributes and does not move either selected navigation element. `placement` is intentionally not part of the API.

## Class invariant

The only supported plain class on `<tj-element-relocator>` is `relocate`. Classes containing `:` are accepted because they may represent responsive expressions that eventually resolve to `relocate`.

Any other class without `:` produces a developer warning but does not throw or disable synchronization.

## Boundaries

`source` and `target` are CSS selectors. The package must stay independent from `@trunkjs/responsive` and must not add resize listeners, media-query handling or breakpoint configuration of its own.
