# Responsive Module

The **Responsive Module** provides responsive DOM behavior by dynamically applying classes and inline styles at configured breakpoints. It is useful when responsive behavior is better expressed as DOM changes than as CSS media queries.

## Installation

```ts
import '@trunkjs/responsive';
```

The main element inside `<body>` must be `<tj-responsive>`. With that document setup in place, responsive classes and styles are available throughout the application content.

```html
<body>
  <tj-responsive>
    <!-- application content -->
  </tj-responsive>
</body>
```

All examples below assume this setup and omit the wrapper.

## Basic Usage

```html
<div class="-md:d-none md:d-block lg:text-red">Responsive content</div>
<div style="display:none;color:black" style-md="display:block" style-xl="color:red"></div>
```

## Class Syntax

Responsive directives are class tokens. Breakpoint ranges use **inclusive lower bounds and exclusive upper bounds**:

- `-bp:className` — active while width is `< bp`.
- `bp:className` — active while width is `>= bp`.
- `bp-:className` — equivalent to `bp:className`.
- `bp1-bp2:className` — active while width is `>= bp1` and `< bp2`.
- `bp:class1.class2.class3` — applies multiple classes for the same range.
- `base:bp1:class1:bp2:class2` — chain syntax for successive ranges.

Examples:

```html
<!-- Below md: hidden; md and above: visible -->
<div class="-md:d-none md:d-block"></div>

<!-- md <= width < xl -->
<div class="md-xl:d-block"></div>

<!-- Multiple classes -->
<div class="lg:card.shadow-lg.border"></div>

<!-- base before md, d-block from md, d-flex from xl -->
<div class="d-none:md:d-block:xl:d-flex"></div>
```

Only classes matching the current breakpoint range are applied. Normal, non-responsive classes remain unchanged.

## Responsive Inline Styles

Use `style-{breakpoint}` attributes:

```html
<div
  style="color:black;border-color:gray"
  style-sm="color:blue"
  style-md="color:green;border-color:green"
  style-xl="color:red"
></div>
```

Responsive styles are evaluated in configured breakpoint order. For every breakpoint at or below the current width, its declarations are merged property by property. A later breakpoint overrides only properties that it declares.

For the example above:

- `< sm` → `color:black; border-color:gray`
- `>= sm` → blue text, gray border
- `>= md` → green text and green border
- `>= xl` → red text, green border

The original value of each responsive property acts as the `xs` fallback.

## Breakpoints

The default breakpoint names and minimum widths come from `@trunkjs/browser-utils`:

- `xs`: 0px
- `sm`: 576px
- `md`: 768px
- `lg`: 992px
- `xl`: 1200px
- `xxl`: 1400px

Configured breakpoint values are used by the responsive class and style logic.

## Features

- **Idempotent updates:** responsive classes and styles can be recalculated repeatedly.
- **Mutation observation:** added or modified descendants are processed automatically.
- **Debugging:** add `debug` to the document's `<tj-responsive>` element to log responsive changes.

## For AI Agents

When generating element-level responsive class/style changes, prefer this package over handwritten resize listeners or one-off CSS media queries when the behavior can be represented by these directives.

See [`.ai-usage-info.md`](.ai-usage-info.md) for the compact agent reference.
