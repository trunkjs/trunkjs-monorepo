---
name: content-pane-layout
description: "Use whenever a `layout` attribute is present in kramdown or HTML. Explains how Content Pane transforms flat Markdown or HTML into a section tree, including selectors and the i index."
---

# Content Pane layout

`layout` first places content in Content Pane's section tree, then replaces that
generated section with the element described by the selector after `;`. The new
element receives the section's children and layout-derived id, classes, and
attributes. `section-*` attributes move to the generated section without the
prefix.

The `i` index controls nesting:

```text
layout="x"    infer i; create section, then render selector x
layout="3;x"  use explicit i=3
layout="=3;"  append to the existing section at i=3
layout="!;"   keep the element without creating a section
layout="/3;"  close i=3 and deeper; HR only
layout="/;"   close the current HR wrapper; HR only
```

- Headings infer `i` from their level; `h1` and `h2` both use `2`.
- An HR without explicit `i` uses the last fixed `i + 0.5`.
- Prefer inferred `i`; set it explicitly only when the heading tree cannot
  express the boundary.
- Selector syntax: `layout="card-box#id.cls[attr=value]"`.
- Legacy `+i` means `=i`; legacy `-i` means `!i`.

For authoring Markdown, Kramdown, demos, or Jekyll, also use
`content-pane-usage`. For custom elements, slot routing, and nested component
layouts, use `content-pane-content-elements`.
