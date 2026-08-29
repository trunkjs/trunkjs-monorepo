---
name: content-pane-markdown
description: Author or edit Markdown and HTML interpreted by @trunkjs/content-pane in demos, websites, CMS content, or Jekyll, including heading trees, Kramdown layout attributes, wrappers, selectors, and layout controls.
---

# Content Pane Markdown

Use this skill whenever content is written for `<tj-content-pane>`. If
`@trunkjs/content-pane` is installed, assume Markdown in demos, website content,
CMS templates, and Jekyll is interpreted by Content Pane unless the repository
explicitly defines another renderer or opts out.

For runtime integration, pre-parsers, or programmatic APIs, use
`content-pane-usage` instead.

## Core model

- Headings define the section tree. Omit an inferable `i`: `h1`/`h2` resolve to
  level `2`, `h3` to `3`, and so on.
- Put `layout` on the heading or content block that owns the generated section:
  `{: layout="page-section" section-class="wide"}`.
- Kramdown block attributes must directly follow their block without a blank
  line. This includes headings, horizontal rules, tables, paragraphs, and lists.
- Use an attributed horizontal rule when a layout container has no heading of
  its own. Without explicit `i`, the HR opens at the last fixed level plus
  `0.5`; prefer this implicit intermediate level when it fits the outline.
- Specify an explicit level only when the heading tree cannot express the
  intended boundary.

```text
layout="x"    inferred heading i; new section
layout="3;x"  explicit i=3; new section
layout="=3;"  reuse/append existing i=3
layout="!;"   no section for element
layout="/3;"  close i=3 and deeper (HR)
layout="/;"   close current level (HR)
```

Legacy: `+i` means `=i`; `-i` means `!i`. Selectors use
`layout="card-box#id.cls[attr=value]"`. Attributes prefixed with `section-` are
moved to the generated section without that prefix.

## Demo Viewer integration

Markdown demos that rely on Content Pane layouts must import the component and
provide it as the structural wrapper:

```ts
import '@trunkjs/content-pane';
import { defineDemo } from '@trunkjs/demo-viewer';
import markdown from './example.md?raw';

export default defineDemo({
  title: 'Content example',
  markdown,
  wrapper_html: '<tj-content-pane>{{content}}</tj-content-pane>',
});
```

## Best practices

Read [Best-practice examples](references/best-practices.md) when creating or
reviewing Content-Pane Markdown. It covers:

- heading-owned layouts;
- headingless HR containers and implicit `+0.5` levels;
- temporary wrappers and closing controls;
- selectors and generated-section attributes;
- Demo Viewer and Jekyll usage.

Preserve the content hierarchy first; use layout controls only for boundaries
that the natural heading tree cannot represent clearly.
