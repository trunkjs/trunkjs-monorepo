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
<div class="-md:d-none md:d-block"></div>
<div class="md-xl:d-block"></div>
<div class="lg:card.shadow-lg.border"></div>
<div class="d-none:md:d-block:xl:d-flex"></div>
```

Only classes matching the current breakpoint range are applied. Normal, non-responsive classes remain unchanged.

## Runtime arbitrary values

Arbitrary values are an escape hatch for rare one-off values when no suitable reusable class exists. They are detected in the DOM and compiled entirely at runtime; no source scan or precompilation takes place.

```html
<tj-responsive layer="trunkjs.utilities">
  <div class="width-[100%] -md:text-size-[18px] md:text-size-[22px]"></div>
</tj-responsive>
```

The optional `layer` attribute wraps generated rules in the named CSS cascade layer:

```css
@layer trunkjs.utilities {
  [class~="width-[100%]"] { width: 100%; }
  [class~="text-size-[22px]"] { font-size: 22px; }
}
```

Set `layer` in the HTML before `<tj-responsive>` connects. Without it, rules are emitted unlayered. Layer names may contain dot-separated CSS identifiers such as `trunkjs.utilities`.

Supported MVP utilities:

- sizing: `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `aspect-ratio`
- spacing: `margin*`, `padding*`, `gap`, `row-gap`, `column-gap`
- typography: `font-size`, `text-size` (alias for `font-size`), `line-height`, `letter-spacing`
- positioning and layout: `top`, `right`, `bottom`, `left`, `inset`, `flex-basis`, `grid-template-columns`, `grid-template-rows`
- details: `border-radius`, `border-width`, `opacity`, `z-index`

Use underscores for spaces inside a class token:

```html
<div class="width-[calc(100%_-_2.5rem)]"></div>
```

For successive values of the same property, prefer chain syntax so only one generated utility class is active:

```html
<div class="width-[100%]:md:width-[50%]:xl:width-[33.333%]"></div>
```

Unsupported properties, invalid CSS values, declaration separators, braces and URL values are ignored. Generated rules are deduplicated per document and layer.

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

## Breakpoints

The default breakpoint names and minimum widths come from `@trunkjs/browser-utils`:

- `xs`: 0px
- `sm`: 576px
- `md`: 768px
- `lg`: 992px
- `xl`: 1200px
- `xxl`: 1400px

## Features

- **Idempotent updates:** responsive classes and styles can be recalculated repeatedly.
- **Mutation observation:** added or modified descendants are processed automatically.
- **Runtime utilities:** selected arbitrary values generate deduplicated CSS rules on the fly.
- **Debugging:** add `debug` to the document's `<tj-responsive>` element to log responsive changes.

## For AI Agents

Prefer existing reusable classes. Use arbitrary runtime values only for exceptional one-off requirements, and do not introduce them when a design token or shared utility should be created instead.

See [`.ai-usage-info.md`](.ai-usage-info.md) for the compact agent reference.
