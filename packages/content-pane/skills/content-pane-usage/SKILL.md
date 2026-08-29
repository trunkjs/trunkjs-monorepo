---
name: content-pane-usage
description: Use @trunkjs/content-pane when writing Markdown pages or consuming Content Pane in demos, websites, CMS content, or Jekyll, including wrappers and optional text-block shortcuts.
---

# Content Pane Usage

Use this skill for Markdown authors and normal Content Pane consumers. If
`@trunkjs/content-pane` is installed, assume Markdown in demos, website content,
CMS templates, and Jekyll is interpreted by Content Pane unless the repository
explicitly defines another renderer or opts out.

`<tj-content-pane>` converts flat heading-based output into a section tree.
Preserve the heading hierarchy and attach Kramdown attributes directly to their
block without a blank line.

Whenever an existing or proposed `layout` attribute is involved, also use `content-pane-layout` for its transformation, selector, and `i`-index semantics.

For developing custom elements that route Content Pane sections into slots, use
`content-pane-content-elements` instead.

## Basic usage

```html
<tj-content-pane>
  <h2 layout="page-section#products.wide">Products</h2>
  <h3>Product A</h3>
</tj-content-pane>
```

Keep the pre-parser disabled unless CMS output still contains text-block shortcuts. Enable it explicitly with `pre-parser="text-block"`:

```html
<tj-content-pane pre-parser="text-block">
  <p>#[nte-input.field name="email" required]</p>
  <p>#[img.hero src="/hero.jpg" alt="Hero image"]</p>
  <p>#[div.notice role="status" > <strong>Saved</strong>]</p>
</tj-content-pane>
```

Each `#[...]` shortcut must occupy one line and must start with a tag name. The selector prefix supports `#id` and `.class`; normal space-separated HTML attributes may follow it. `>` starts optional inner HTML. Native void elements such as `img` and `input` must not receive content, while custom elements are created as normal paired DOM elements.

Malformed shortcuts are left unchanged and reported as warnings so Content Pane arrangement can continue. Only enable raw inner HTML for trusted CMS content; do not pass untrusted user input through the text-block pre-parser.

`TextBlockPreParser` and `ContentPanePreParser` are public exports for programmatic use and future pre-parser implementations.

For heading-owned layouts, headingless HR containers, Demo Viewer wrappers,
Jekyll, selectors, and closing controls, read
[Best-practice examples](references/best-practices.md).
