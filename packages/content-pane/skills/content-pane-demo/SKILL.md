---
name: content-pane-demo
description: Test Markdown and Kramdown layout markup with @trunkjs/content-pane inside @trunkjs/demo-viewer demos.
---

# Content Pane Markdown demos

Use a `.demo.ts` file with the Demo Viewer's existing `markdown` and `wrapper_html` fields. Import `@trunkjs/content-pane` so `<tj-content-pane>` is registered; no custom render function or separate Markdown loader is needed.

```ts
import '@trunkjs/content-pane';
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Markdown layout',
  markdown: `## Main content
{: layout="example-layout"}

Content rendered inside the layout.`,
  wrapper_html: '<tj-content-pane>{{content}}</tj-content-pane>',
});
```

The Demo Viewer first converts `markdown` with `@trunkjs/ast-markdown`, inserts the resulting HTML at `{{content}}`, and then Content Pane arranges the connected element. Keep every Kramdown block attribute line directly below its target block without a blank line, including attributes following headings, horizontal rules, tables, or paragraphs.

Use this as the primary demo shape for elements meant to work in layout/content contexts. Use `html` or `render(root)` only when Markdown cannot express the public API or the demo is primarily programmatic or interaction-driven.

Verify the rendered demo in its normal viewer route: inspect `<tj-content-pane>` after arrangement, confirm the requested layout element and content assignment, and check that the viewer reports no runtime error. Add `pre-parser="text-block"` to `wrapper_html` only when the demo intentionally exercises the optional `#[...]` text-block syntax.
