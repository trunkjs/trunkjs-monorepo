# content-pane

This library was generated with [Nx](https://nx.dev).

A lightweight toolkit for turning a flat block of HTML content into a, styled “content pane.” It provides:

- A Web Component (<content-area2>) that automatically:
  - Builds a nested section structure from your headings and horizontal rules.
  - Applies layout transformations based on a compact layout attribute syntax.
- A small set of utilities you can call programmatically:
  - SectionTreeBuilder: wraps related content into nested <section> containers.
  - applyLayout: transforms elements based on a layout string (tag#id.class1.class2).
  - attrAssign: helper to assign attributes to selected children.

Status: experimental / evolving API.

## Why use content-pane?

If you have document-like content (headings, paragraphs, images, etc.) and want:
- Automatic, semantic grouping of content into sections
- Declarative, inline layout instructions per element
- A no-shadow-DOM approach that keeps your stylesheets simple

…content-pane is for you.

## Packages and exports

Install or import from:
- @trunkjs/content-pane

Exports:
- Web Component: registered as custom element content-area2
- Functions:
  - applyLayout(elementOrElements, { recursive = true })
  - attrAssign(element, multiQuerySelector, attributes)
  - SectionTreeBuilder class

Import examples:
- Register the custom element (side-effect import): import '@trunkjs/content-pane'
- Use utilities: import { applyLayout, attrAssign } from '@trunkjs/content-pane'

## The <content-area2> Web Component

The component is defined without Shadow DOM (createRenderRoot returns this), so your global CSS can style the generated structure directly.

What it does on connect:
1. Waits for DOMContentLoaded
2. Builds a section tree from its direct children using SectionTreeBuilder
3. Applies layout transformations to itself and its descendants using applyLayout

Tag name: content-area2

Note: The internal class is ContentAreaElement2. The static is getter returns 'tj-content-area' but the actual registered tag is content-area2.

### Quick start (browser)

- Include content-area2 on your page
- Ensure the module is imported so the element is defined
- Add headings and content as children

Example:
<!-- somewhere in your app bootstrap -->
<script type="module">
  import '@trunkjs/content-pane'; // registers <content-area2>
</script>

<content-area2>
  <h2 layout="2">Introduction</h2>
  <p>This is the intro paragraph.</p>

  <h3>Details</h3>
  <p>Some detailed text.</p>

  <hr> <!-- becomes a mid-level divider -->
  <h2 layout="+2">More</h2>
  <p>Additional information appended at the same level as previous H2.</p>

  <!-- An element with layout that transforms into an <aside> -->
  <div layout="2.5;aside#toc.toc right">
    <p>Table of contents here…</p>
  </div>
</content-area2>

## The SectionTreeBuilder

SectionTreeBuilder rearranges a flat list of nodes into nested <section> elements based on:
- Heading levels (H1–H6) mapped to a 10s scale (H2 → 20, H3 → 30, …). H1 is treated as H2.
- Horizontal rules (HR) which become implicit dividers at lastFixedI + 5.
- Optional layout prefix directives on elements to influence grouping.

It processes only element nodes (other node types are appended as-is) and respects a small “index” (i) model for nesting.

### Layout prefix for sectioning

If a node has a layout attribute, the prefix can shape the sectioning behavior:

Pattern: ^(\+|-|)([0-9]?\.?[0-9]?|)(;|$)

- Variant:
  - + → append: place the node inside the existing container at the computed level
  - - → skip: do not start a new section for this node; it’s appended to the current container
  - (none) → new: create a new section container at this level
- Level number:
  - Optional number (e.g., 2, 2.5) scaled to 10s internally (2 → 20). If absent, heading tags provide the default.
  - Decimals allow interleaving content between heading levels (e.g., 2.5 sits between H2 (20) and H3 (30)).

When creating a new <section>, SectionTreeBuilder:
- Moves attributes beginning with layout from the original node onto the new section and removes them from the original.
- Copies attributes starting with section- and converts section-* class names to classes on the section wrapper (prefix removed).
- For HR elements, copies all attributes to the section wrapper.

Note: The attribute handling is intentionally conservative to avoid disrupting your original elements more than necessary.

### Programmatic usage

import { SectionTreeBuilder } from '@trunkjs/content-pane';

const container = document.querySelector('#my-content') as HTMLElement;
const stb = new SectionTreeBuilder(container);
stb.arrange(Array.from(container.children));

This will restructure the container’s children into nested <section> elements.

## applyLayout

applyLayout transforms elements based on a compact layout attribute:
- Syntax: [prefix][;]selector
  - Prefix: the same prefix as used by SectionTreeBuilder, typically used for sectioning (see above). applyLayout strips this prefix before applying the selector.
  - Selector: a simplified CSS-like “element definition” of the form tag#id.class1.class2. If tag is omitted, defaults to div.

Behavior:
- For each element with a layout attribute, applyLayout:
  - Parses the layout string, ignoring any leading sectioning prefix
  - Creates a replacement element using the parsed tag, id, and classes
  - Moves the original element’s children into the replacement element
  - Replaces the original element in the DOM
- If the selector’s tag is a custom element name (contains -) and that element is not registered, applyLayout replaces it with an error element (TjErrorElement) to prevent infinite recursion and to make the issue visible in the DOM.

Options:
- recursive (default: true): apply the transformation to descendants as well.

Return value:
- An array of HTMLElements that were processed or produced by replacements.

Example:
import { applyLayout } from '@trunkjs/content-pane';

const el = document.querySelector('#article')!;
applyLayout(el, { recursive: true });

<!-- Before -->
<div id="sidebar" layout="2;aside#right.aside-panel">
  <p>Sidebar content</p>
</div>

<!-- After (conceptually) -->
<aside id="right" class="aside-panel" layout="2;aside#right.aside-panel">
  <p>Sidebar content</p>
</aside>

Note: applyLayout preserves the original layout attribute on the replacement element so you can re-run the layout step if needed or inspect the intent.

### Manual before-layout hook

If a custom element used as a replacement implements a beforeLayoutCallback(origElement, instance, children) method, it will be called before children are attached and layout is applied to descendants. Returning false from this method will skip recursive layout for that element, allowing it to manage its own internal layout.

Type signature:
interface ManualBeforeLayoutElement {
  beforeLayoutCallback(origElement: HTMLElement, instance: this, children: Element[]): void | boolean;
}

## attrAssign

Utility to assign attributes to multiple selected descendants using a simple multi-selector separated by |.

Signature:
attrAssign(element: HTMLElement, multiQuerySelector: string, attributes: Record<string, string>): HTMLElement[]

- multiQuerySelector example: ':scope > .aside | :scope > *:has(img)'
- Returns an array of HTMLElements that received the attributes.

Example:
import { attrAssign } from '@trunkjs/content-pane';

const host = document.querySelector('section')!;
attrAssign(host, ':scope > img | :scope > figure', { slot: 'media' });

## Styling the generated structure

Because <content-area2> does not use Shadow DOM, you can style:
- section wrappers produced by SectionTreeBuilder
- any elements produced by applyLayout
- your original content elements

Typical patterns:
- Target sections based on heading-derived structure
- Use IDs and classes assigned via layout or attrAssign
- Combine with CSS container queries for responsive layouts

## Notes and caveats

- H1 is treated as H2 (i = 20) to keep top-level content consistent.
- HR becomes a divider at half-steps (+5) between major heading levels.
- The package assumes you will either:
  - Use <content-area2>, which orchestrates both steps, or
  - Manually call SectionTreeBuilder then applyLayout in that order.
- If you reference an unregistered custom element in a layout selector, an error element is inserted to make the problem visible and to avoid infinite recursion.

## Building

Run `nx build content-pane` to build the library.

## Running unit tests

Run `nx test content-pane` to execute the unit tests via [Vitest](https://vitest.dev/).