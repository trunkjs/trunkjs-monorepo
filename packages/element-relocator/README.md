# @trunkjs/element-relocator

A small Custom Element for moving navigation items between two responsive navigation elements.

## Usage

```html
<tj-responsive>
  <header>
    <nte-nav-2 id="desktop-navigation">...</nte-nav-2>
  </header>

  <aside>
    <nte-nav-2 id="mobile-navigation"></nte-nav-2>
    <tj-element-relocator
      source="#desktop-navigation"
      target="#mobile-navigation"
      class="md:relocate"
    ></tj-element-relocator>
  </aside>
</tj-responsive>
```

`tj-element-relocator` itself has no breakpoint logic. `@trunkjs/responsive` (or any other mechanism) controls whether the `relocate` class is present.

When `relocate` appears, the direct child navigation items selected by `source` are moved into the `target` navigation. The source navigation is empty while the target is filled. When `relocate` disappears, the items are moved back to the source navigation.

Both `source` and `target` are required CSS selectors. The target should be a second, dedicated navigation element, for example a horizontal `nte-nav-2` in the header and a vertical `nte-nav-2` in an off-canvas. The source is observed so newly added navigation items are moved as well.

`placement` is no longer supported.

## Class contract

The element observes changes to `class`, `source`, and `target`.

The only supported plain class is `relocate`. Class names containing `:` are accepted as responsive expressions. Any other class name without `:` causes a `console.warn`, but does not prevent synchronization.
