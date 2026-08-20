---
name: content-pane-layout-template
description: Use when a skill must generate or edit Markdown/HTML for @trunkjs/content-pane: build nesting from heading index i (h1/h2=2,h3=3,...), use hr[layout] for i+0.5 wrappers, layout i/+i/-i prefixes, section-* passdown attributes, and predict the final layout-element HTML.
---

# ContentPane layout template

Use Markdown passdown attributes directly after the element:

```md
## Products
{: layout="page-section" section-class="wide"}
```

`i`: smaller=outer, larger=deeper; `h1/h2=2`, `h3=3`, `h4=4`, ... . `layout="3;x"` sets explicit `i=3`; `layout="+3;"` appends to the existing i=3 section; `layout="-3;"` creates no section. `hr[layout]` without explicit `i` creates a wrapper at the last fixed `i + 0.5`; plain `hr` is ignored. Prefer `layout` on the owning heading; use `hr[layout]` only for an extra wrapper.

`section-*` configures the generated section and loses the prefix (`section-class`, `section-id`, `section-style`). Layout selector syntax may include tag/id/class/attrs: `layout="card-box#id.cls[slot=main]"`.

```md
## Products
{: layout="page-section"}

---
{: layout="card-grid"}

### A
### B
```

Tree: `page-section(i=2) > card-grid(i=2.5) > h3 sections(i=3)`.

Result after layout application:

```html
<page-section><h2>Products</h2><card-grid><hr hidden aria-hidden="true"><section><h3>A</h3></section><section><h3>B</h3></section></card-grid></page-section>
```

When copying this template into another skill, keep the rules above and replace only domain-specific examples/instructions.
