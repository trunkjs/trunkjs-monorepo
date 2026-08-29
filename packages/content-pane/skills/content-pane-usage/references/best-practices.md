# Content Pane usage best practices

## Heading-owned layout

Attach the Kramdown attribute directly to the heading when the layout and
heading describe the same section:

```markdown
## Products
{: layout="page-section#products.wide"}

Introductory text.

### Product A

Product details.
```

Content Pane infers the section level from the heading. Do not add a numeric
layout index when the heading already supplies it.

## Headingless layout between outline levels

Use a horizontal rule when the container needs no heading of its own. The
attribute must be on the immediately following line:

```markdown
## Frequently asked questions

This introduction remains outside the component.

---
{: layout="nte-accordion[initial-open-index='0'][exclusive]"}

### First question

First answer.

### Second question

Second answer.
```

The HR is placed at the last fixed level plus `0.5`. Here it sits between the
`h2` section and its `h3` children, so it wraps the questions without requiring
an artificial component heading or an explicit layout index.

This pattern is appropriate for headingless components, groups, and controls
that wrap the following subsections while introductory content remains in the
parent section.

## Temporary wrapper and closing control

Use an explicit level only when a wrapper deliberately spans multiple sibling
sections and cannot be derived from one heading:

```markdown
---
{: layout="1;page-background"}

## Intro

Intro content.

## Features

Feature content.

---
{: layout="/1;"}

## Outside

Content after the temporary background.
```

The closing HR is a control and is removed from the rendered output.

## Selectors and section attributes

The layout value uses CSS-selector notation for the generated element. Prefix
attributes with `section-` when they belong to the generated section:

```markdown
## Feature
{: layout="feature-card#primary.highlighted[data-kind=product]" section-class="wide" section-aria-label="Primary feature"}

Feature content.
```

This creates the selected layout element and moves `class="wide"` and
`aria-label="Primary feature"` to its generated section.

## Tables and other attributed blocks

Kramdown attributes always follow the block directly, including tables:

```markdown
| Name | Status |
| --- | --- |
| Alpha | Active |
{: layout="data-table" }
```

Never insert a blank line before the attribute, because Kramdown would no
longer associate it with the intended block.

## Demo Viewer

Import Content Pane and wrap the rendered Markdown explicitly:

```ts
import '@trunkjs/content-pane';
import { defineDemo } from '@trunkjs/demo-viewer';
import markdown from './example.md?raw';

export default defineDemo({
  title: 'Content Pane example',
  description: 'Heading-derived layout rendered from Markdown',
  markdown,
  wrapper_html: '<tj-content-pane>{{content}}</tj-content-pane>',
});
```

Without the wrapper, Demo Viewer renders ordinary Markdown but does not apply
Content Pane's section tree and layout transformation.

## Jekyll and website content

Keep normal Jekyll front matter at the start of the document. Content Pane
layout attributes belong to the Markdown body and remain directly attached to
their blocks:

```markdown
---
title: Products
layout: default
---

## Products
{: layout="page-section.products"}

Product overview.
```

When `@trunkjs/content-pane` is installed for the site, treat authored Markdown
as Content-Pane input by default unless the project explicitly documents a
different rendering path. Preserve valid Jekyll syntax first; Content Pane then
arranges the HTML generated from the Markdown body.
