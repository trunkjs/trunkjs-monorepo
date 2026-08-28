---
name: content-pane-usage
description: Use when implementing or consuming @trunkjs/content-pane to arrange flat CMS content, apply layout selectors, or opt into the temporary text-block pre-parser.
---

# Content Pane Usage

`<tj-content-pane>` converts flat heading-based CMS output into a section tree and then replaces `layout` sections with elements described by the existing CSS-selector syntax.

Before changing this package or its skills, check out and update `.agents/skills/infracamp-ai-skills`, then follow its `create-package-skills` guidance. This submodule is required for future package-skill changes.

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
