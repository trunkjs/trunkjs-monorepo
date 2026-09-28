# 06 — Shadow DOM only when explicitly needed

**Light DOM is the default.** Use the application's CSS for ordinary Prolit elements.
Enable shadow DOM only when requested or when an externally embedded widget needs
style isolation. The [component](06-shadow-dom.ts) and [CSS file](06-shadow-dom.css)
form a complete Vite example; no constructor is needed for the rendering mode.

Run `npx nx serve prolit-elements` and open
`http://localhost:4000/examples/index.html?example=06`.

## Import CSS into the shadow root

The component uses these declarations:

```ts
import { unsafeCSS } from 'lit';
import widgetCss from './06-shadow-dom.css?inline';

// Inside the element class:
static override useShadowDom = true;
static override styles = unsafeCSS(widgetCss);
```

Vite's [`?inline` CSS import](https://vite.dev/guide/features#disabling-css-injection-into-the-page)
returns processed CSS as a string without adding a document stylesheet.
[Lit styles](https://lit.dev/docs/components/styles/) need a CSSResult rather than
a raw string, so `unsafeCSS(widgetCss)` supplies that conversion for this trusted
source file. It is not a place for user-supplied CSS.
The consuming TypeScript project needs Vite's `vite/client` types for `?inline`
imports; this package already includes them.

For additional component-local rules, replace the assignment with:

```ts
import { css, unsafeCSS } from 'lit';

static override styles = [
  unsafeCSS(widgetCss),
  css`:host { max-width: 24rem; }`,
];
```

A normal `import './styles.css'` injects page styles and is appropriate for light
DOM, as shown in example 07. It does not style the internals of this shadow root.
The shadow stylesheet uses `:host` for the element and ordinary selectors for its
internal nodes; inherited properties and CSS custom properties can still cross
the boundary.

## Supply a named slot from light DOM

After importing the component module, use:

```html
<example-embedded-counter>
  <span slot="heading">External widget</span>
</example-embedded-counter>
```

The component's shadow template contains `<slot name="heading">`.
The supplied span remains in light DOM and is projected into that slot.
Without it, the fallback heading is “Embedded counter”.
This slot belongs to the widget; it does not add title/footer slots to the dialog renderer.

The button initially shows “Clicks: 0”; clicking it shows “Clicks: 1”.
The `on('click', ..., { target: 'shadowRoot' })` callback increments a second counter.
Its constructor exists only for event registration: the mixin deregisters on
disconnect and registers once again on reconnect. There are no manual
connect/disconnect methods or render-root overrides.
