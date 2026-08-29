# Content Pane architecture

## Purpose

`@trunkjs/content-pane` turns flat, heading-based CMS output into a section tree
and applies declarative layout elements without coupling authored content to an
application framework. Markdown processors such as Jekyll or Demo Viewer first
produce HTML; `<tj-content-pane>` then owns section arrangement and layout
transformation.

## Package-skill architecture

Content Pane publishes three deliberately separate skills:

| Skill | Responsibility |
| --- | --- |
| `content-pane-layout` | Canonical, compact semantics of every `layout` attribute and the `i` index. |
| `content-pane-markdown` | Authoring Content-Pane Markdown/HTML in demos, websites, CMS templates, and Jekyll. |
| `content-pane-usage` | Runtime integration, component API, pre-parsers, and programmatic use. |

This split keeps automatic discovery precise and avoids loading authoring
examples during runtime work or runtime details during ordinary content edits.

## Layout skill invariant

Whenever an agent finds, reads, writes, explains, reviews, or changes a
`layout` attribute, it must load `content-pane-layout` before interpreting or
modifying that attribute. This trigger belongs in the skill's frontmatter
description so it is visible during skill selection.

`content-pane-layout` is loaded frequently and must remain compact. It owns only
the stable transformation contract, selector syntax, `i`-index rules, and
control operators. Extended rationale, Markdown patterns, Demo Viewer setup,
Jekyll examples, and domain-specific components belong in
`content-pane-markdown` or its references.

The other Content Pane skills must link to `content-pane-layout` whenever they
mention what `layout` does. They must not maintain a competing copy of the
layout grammar. When layout parsing or `i` behavior changes, update the compact
layout skill first, then align relevant examples and tests.

## Markdown authoring default

When `@trunkjs/content-pane` is installed, `content-pane-markdown` assumes that
Markdown authored for demos, websites, CMS templates, or Jekyll is Content-Pane
input unless the consuming project explicitly documents a different renderer
or opts out. Content-Pane Demo Viewer examples must import the component and
wrap rendered Markdown in `<tj-content-pane>`.

## Publication boundary

The package-local skills and their references are published with the npm
package. This `ARCHITECTURE.md` is internal maintainer guidance and must not be
copied to `dist` or published as consumer documentation.
