---
name: content-pane-layout-template
description: Use when a skill generates or edits @trunkjs/content-pane Markdown/HTML: prefer heading-derived i with layout on the heading and no explicit i; use hr[layout] or explicit i only when an extra/non-heading layout level is required; support i/+i/-i, section-* passdown attributes, and final layout HTML.
---

# ContentPane layout template

Default: use the document headings as the tree. Omit `i` whenever it follows from the heading (`h1/h2=2`, `h3=3`, `h4=4`, ...), and put `layout` directly on the heading that owns the section.

```md
## Products
{: layout="page-section" section-class="wide"}
```

Use Markdown passdown attributes directly after the element (`{: ... }`). `section-*` configures the generated section and loses the prefix.

Only introduce `<hr layout="...">` when an extra wrapper has no own heading, e.g. one grid containing several tiles that each have their own heading. Without explicit `i`, HR uses the last fixed `i + 0.5`. Use explicit `i` only when the desired layout level cannot be inferred from the heading/context.

```text
layout="x"      inferred heading i; new section (preferred)
layout="3;x"    explicit i=3; new section
layout="+3;"    append to existing i=3 section
layout="-3;"    no new section
```

Selector syntax: `layout="card-box#id.cls[slot=main]"`.

```md
## Products
{: layout="page-section"}

---
{: layout="card-grid"}

### A
### B
```

Tree: `page-section(i=2) > card-grid(i=2.5) > h3 sections(i=3)`.

Result:

```html
<page-section><h2>Products</h2><card-grid><hr hidden aria-hidden="true"><section><h3>A</h3></section><section><h3>B</h3></section></card-grid></page-section>
```

When copying this template, preserve these ContentPane rules and replace only domain-specific instructions/examples.
