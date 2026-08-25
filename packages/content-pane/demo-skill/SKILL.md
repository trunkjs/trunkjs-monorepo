---
name: content-pane-layout-template
description: Use when generating/editing @trunkjs/content-pane Markdown/HTML: prefer heading-derived i and layout on headings; use HR only for non-heading wrappers/closing, explicit i only when needed, =i to reuse, ! to skip, /i to close, section-* passdown attributes, and predict final layout HTML.
---

# ContentPane layout template

Default: headings define the tree; omit inferable `i` (`h1/h2=2`, `h3=3`, ...), put `layout` on the owning heading, and set Markdown passdown attributes directly after it: `{: layout="page-section" section-class="wide"}`.

Use HR only when a layout wrapper/control has no own heading. Implicit HR opens at last fixed `i + 0.5`. Explicit `i` is exceptional.

```text
layout="x"    inferred heading i; new section
layout="3;x"  explicit i=3; new section
layout="=3;"  reuse/append existing i=3
layout="!;"   no section for element
layout="/3;"  close i=3 and deeper (HR)
layout="/;"   close current level (HR)
```

Legacy: `+i`=`=i`, `-i`=`!i`. `section-*` moves to generated section without prefix. Selector: `layout="card-box#id.cls[attr=value]"`.

For a temporary background:

```md
---
{: layout="1;page-background"}

## Intro
## Features

---
{: layout="/1;"}

## Outside
```

Result: `<page-background>...Intro...Features...</page-background><section><h2>Outside</h2></section>`; closing HR is removed.

When copying this template, preserve these rules; replace only domain-specific instructions/examples.
