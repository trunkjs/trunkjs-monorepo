---
name: element-relocator
description: Use @trunkjs/element-relocator when navigation items must be synchronized from one responsive navigation to another.
---

# TrunkJS Element Relocator

Use `<tj-element-relocator>` to move direct navigation-item children between two elements identified by CSS selectors. The relocator does not implement breakpoints itself. Prefer `@trunkjs/responsive` to control when the plain `relocate` class is present.

## Basic usage

```html
<tj-responsive>
  <nte-nav-2 id="desktop-navigation">
    <nte-nav-item href="/">Start</nte-nav-item>
  </nte-nav-2>

  <nte-offcanvas>
    <nte-nav-2 id="mobile-navigation"></nte-nav-2>
    <tj-element-relocator
      source="#desktop-navigation"
      target="#mobile-navigation"
      class="-lg:relocate"
    ></tj-element-relocator>
  </nte-offcanvas>
</tj-responsive>
```

`source` and `target` are both required CSS selectors. When the relocator has the plain `relocate` class, the source's direct navigation-item children are moved into the target. The source navigation is empty while the target is filled, so the header and off-canvas never show the same items simultaneously.

When `relocate` disappears, the items are moved back to the source. Changes to the source child list are moved while relocation is active. The target should be a dedicated, initially empty destination.

Do not implement separate resize listeners or breakpoint handling around the relocator when `@trunkjs/responsive` can express the condition.

## Attributes

- `source`: required CSS selector for the source navigation.
- `target`: required CSS selector for the destination navigation.

`placement` is not supported. The relocator moves navigation items between the two selected elements instead of moving either navigation element or relying on slot reassignment.

## Class contract

Treat the relocator's classes as control input, not as general styling classes.

The only supported plain class is `relocate`. Responsive expressions containing `:` are allowed, for example `-lg:relocate`. Do not add unrelated plain classes; they produce a developer warning.
