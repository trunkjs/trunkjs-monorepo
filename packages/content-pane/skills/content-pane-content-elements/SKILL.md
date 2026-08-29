---
name: content-pane-content-elements
description: Develop custom elements for @trunkjs/content-pane using SubLayoutApplyMixin, data-query slot selectors, selector variables, automatic slot assignment, and nested layouts.
---

# Content Pane content elements

Use this skill only when developing custom elements that consume Content Pane
sections. For authoring pages, use `content-pane-usage`; whenever `layout` is
involved, also use `content-pane-layout`.

Apply `SubLayoutApplyMixin` to a Lit element and declare routing in its slots:

```ts
class ContentCard extends SubLayoutApplyMixin(LitElement) {
  protected render() {
    return html`
      <slot name="header" data-query=":scope > h2, :scope > h3"></slot>
      <slot data-query=":scope > section" data-set-attribute-layout="content-item"></slot>
    `;
  }
}
```

- `data-query` alternatives are separated by `|`; all matches from the first
  successful alternative are used.
- A named slot is routed only when empty. Matches receive its `slot` name; the
  default slot is also processed.
- `data-set-attribute-*` sets a missing attribute on every match.
- `@var(--selector)` reads a selector from a host CSS custom property. Missing,
  invalid, or non-matching variables continue with the next alternative.
- Variable assignments run after literal selectors and can override built-in
  routing. Resolution runs once in `firstUpdated`.
- Nested `layout` attributes are applied after slot assignment. The default
  `beforeLayoutCallback()` returns `false`, deferring child layout work until
  the component arranges its own children.
- Register the custom element before Content Pane applies its layout selector.
