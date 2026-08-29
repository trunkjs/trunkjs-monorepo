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

Whenever content contains or introduces a `layout` attribute, also use
`content-pane-layout` as the source of truth for its transformation and `i`
index.

## Core model

- Put `layout` on the heading or content block that owns the generated section:
  `{: layout="page-section" section-class="wide"}`.
- Kramdown block attributes must directly follow their block without a blank
  line. This includes headings, horizontal rules, tables, paragraphs, and lists.
- Use an attributed horizontal rule when a layout container has no heading of
  its own. Prefer its implicit intermediate level when it fits the outline.

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
that the natural heading tree cannot represent clearly. Read
`content-pane-layout` before choosing an explicit `i` or a layout control.
