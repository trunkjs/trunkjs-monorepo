# Custom Elements and Mixins

Use these APIs for lifecycle-aware browser components. Preserve each superclass lifecycle call when overriding `connectedCallback`, `disconnectedCallback`, or `firstUpdated`.

## Bind and clean up events

`EventBindingsMixin` registers decorated methods on connection and removes every registered listener through an internal `AbortController` on disconnection.

```ts
import { EventBindingsMixin, Listen } from '@trunkjs/browser-utils';

class SearchBox extends EventBindingsMixin(HTMLElement) {
  @Listen('input', { target: 'host' })
  onInput(event: InputEvent): void {
    const input = event.target as HTMLInputElement;
    this.dispatchEvent(new CustomEvent('search', { detail: input.value }));
  }

  @Listen('resize', { target: 'window', options: { passive: true } })
  onResize(): void {
    this.toggleAttribute('compact', window.innerWidth < 768);
  }
}

customElements.define('search-box', SearchBox);
```

Available targets are `host`, `document`, `window`, `shadowRoot`, an `EventTarget`, or a callback receiving the host. `shadowRoot` falls back to the host when no shadow root exists.

```ts
class ShortcutPanel extends EventBindingsMixin(HTMLElement) {
  @Listen(['keydown', 'keyup'], { target: 'document' })
  onKey(event: KeyboardEvent): void {
    this.toggleAttribute('modifier-active', event.ctrlKey || event.metaKey);
  }

  @Listen('click', { target: (host) => host.querySelector('button') ?? host })
  onAction(): void {
    this.dispatchEvent(new Event('action'));
  }
}
```

Add application-specific events to `DocumentEventMap` to retain decorator inference:

```ts
declare global {
  interface DocumentEventMap {
    'cart:updated': CustomEvent<{ itemCount: number }>;
  }
}

class CartBadge extends EventBindingsMixin(HTMLElement) {
  @Listen('cart:updated', { target: 'document' })
  onCartUpdated(event: DocumentEventMap['cart:updated']): void {
    this.textContent = String(event.detail.itemCount);
  }
}
```

Do not use `@Listen` without `EventBindingsMixin`; the decorated method deliberately throws when invoked on an incompatible class.

## Add element-aware logging

`LoggingMixin` prefixes output with the tag and element instance. `debug()` only prints when the element has a truthy `debug` attribute; `log()`, `warn()`, and `error()` remain visible. Values `false`, `0`, `off`, and `no` disable debugging.

```ts
import { LoggingMixin } from '@trunkjs/browser-utils';

class DataPanel extends LoggingMixin(HTMLElement) {
  connectedCallback(): void {
    this.debug('connected', { source: this.dataset.source });
  }

  attributeChangedCallback(name: string): void {
    if (name === 'debug') this.invalidateDebugCache();
  }

  loadFailed(error: unknown): void {
    this.error('load failed', error);
  }
}
```

```html
<data-panel debug data-source="orders"></data-panel>
```

Use `throwError(...)` only when the caller should receive an exception. `getLogger(instanceId)` is cached per element, so choose a custom instance ID on the first call if one is required.

## Map a custom element to responsive modes

`BreakPointMixin` reads `--breakpoint` from the host and sets `mode="mobile|tablet|desktop"` as the window crosses the configured thresholds.

```ts
import { BreakPointMixin } from '@trunkjs/browser-utils';

class AdaptiveNav extends BreakPointMixin(HTMLElement) {}
customElements.define('adaptive-nav', AdaptiveNav);
```

```css
adaptive-nav {
  /* mobile below md, tablet from md, desktop from lg */
  --breakpoint: 'md,lg';
}

adaptive-nav[mode='mobile'] .labels {
  display: none;
}
```

A single value uses the same threshold for tablet and desktop. Use only breakpoint names exported by the package.

## Coordinate Lit elements with the loader

`LoaderMixin` reports a Lit element as waiting during `connectedCallback`, ready after `firstUpdated`, and no longer blocking after disconnection. Pair it with the loader-aware wait functions where code must align with the visual startup phases.

```ts
import { LoaderMixin, waitForPreVisual, waitForReady, waitForVisual } from '@trunkjs/browser-utils';
import { LitElement, css, html } from 'lit';

class HeroCard extends LoaderMixin(LitElement) {
  static styles = css`:host { opacity: 0; } :host([visible]) { opacity: 1; }`;

  render() {
    return html`<slot></slot>`;
  }

  override async firstUpdated(changed: Map<string, unknown>) {
    super.firstUpdated(changed);
    await waitForPreVisual();
    this.toggleAttribute('visible', true);
  }
}

await waitForReady();
prepareFinalLayout();
await waitForVisual();
startNonEssentialAnimation();
```

When no TrunkJS loader sets `window.tj_loader_state`, these waits fall back to the normal window load event.

## Style empty slots in Lit

`SlotVisibilityMixin` adds `slot-empty` directly to an empty `<slot>` and updates it on `slotchange`. Whitespace and Lit comment markers do not count as content; fallback children do.

```ts
import { SlotVisibilityMixin } from '@trunkjs/browser-utils';
import { LitElement, css, html } from 'lit';

class OptionalAside extends SlotVisibilityMixin(LitElement) {
  static styles = css`
    slot.slot-empty {
      display: none;
    }
  `;

  render() {
    return html`<aside><slot name="aside"></slot></aside>`;
  }
}
```

Compose mixins only as needed, keeping lifecycle-aware mixins in the inheritance chain:

```ts
class InteractivePanel extends LoggingMixin(EventBindingsMixin(SlotVisibilityMixin(LitElement))) {
  @Listen('visibilitychange', { target: 'document' })
  onVisibilityChange(): void {
    this.debug('document visibility', document.visibilityState);
  }
}
```
