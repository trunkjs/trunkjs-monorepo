---
name: trunkjs-responsive
description: Use @trunkjs/responsive for breakpoint-driven DOM classes and inline styles instead of one-off CSS media queries. Quick syntax: `-md:x` below md, `md:x` from md, `md-xl:x` from md until xl, `md:a.b` for multiple classes, `base:md:a:xl:b` for chained states, and `style-md="prop:value"` for responsive inline styles.
---

# @trunkjs/responsive Reference Skill

Use this file as the reference when creating or updating an AI skill that works with `@trunkjs/responsive`. Assume responsive styling is already active for application content.

```html
<div
  class="card -md:d-none md-xl:d-block.shadow xl:d-flex"
  style="width:100%"
  style-md="width:50%"
  style-xl="width:33%"
>Content</div>
```

Syntax: `-bp:class` = below bp, `bp:class` = from bp, `bp1-bp2:class` = from bp1 until bp2, `bp:a.b` = multiple classes, `base:bp:a:bp2:b` = chained states, `style-bp="..."` = responsive inline properties.

For behavioral details and current defaults, read [`.ai-usage-info.md`](./.ai-usage-info.md). Keep this reference skill synchronized with that file when the responsive syntax changes.
