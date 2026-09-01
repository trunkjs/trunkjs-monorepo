# @trunkjs/element-relocator

A small Custom Element for temporarily moving an existing DOM element to a responsive destination and restoring its exact original position afterwards.

## Usage

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

`tj-element-relocator` itself has no breakpoint logic. `@trunkjs/responsive` (or any other mechanism) controls whether the `relocated` class is present.

When `relocated` appears, the element selected by `source` is moved to the relocator. When it disappears, the source is restored to its exact original DOM position using an internal comment anchor.

## Placement

`placement` controls where the source is placed relative to `<tj-element-relocator>`:

- `inside` (default): source becomes a child of the relocator.
- `before`: source becomes the previous sibling of the relocator.
- `after`: source becomes the next sibling of the relocator.

Sibling placement is useful for Web Components and slots because the relocated source remains in the relocator's parent light DOM.

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

## Class contract

The element observes changes to `class`, `source`, and `placement`.

The only supported plain class is `relocated`. Class names containing `:` are accepted as responsive expressions. Any other class name without `:` causes a `console.warn`, but does not prevent relocation.
