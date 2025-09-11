# @trunkjs/browser-utils

A small collection of browser-focused, framework-agnostic utilities that make common DOM and timing tasks easier. All utilities are written in TypeScript and ship as ES modules.

Exports:
- create_element: Minimal DOM element factory
- Debouncer: Debounce helper with optional max-delay
- Stopwatch: Lightweight performance timer with lap logging
- waitFor, waitForDomContentLoaded, waitForLoad, sleep, waitForAnimationEnd: Promise-based event and timing helpers
- LoggingMixin: Lightweight logging mixin for Custom Elements

- [Event Bindings  for WebComponents](./docs/README_EventHandling.md)

## Installation

Within this monorepo, the package is consumed via path aliases. If you publish or consume it externally, import from the package name:

```ts
import { } from '@trunkjs/browser-utils';
```


## Quick start

### `function create_element()`: Create and append an element

```ts
import { create_element } from '@trunkjs/browser-utils';

const card = create_element('section', { class: 'card', 'aria-live': 'polite' }, [
  create_element('h2', {}, 'Title'),
  create_element('p', {}, 'This is a paragraph.'),
  create_element('button', { disabled: true }, 'Disabled'),
]);

document.body.appendChild(card);
```

Notes:
- Attributes with value true create boolean attributes (e.g. disabled becomes disabled="").
- Attributes with null or undefined are omitted.

### `class Debouncer`:Debounce input handling

```ts
import { Debouncer } from '@trunkjs/browser-utils';

const debouncer = new Debouncer(300, 2000); // 300ms debounce, 2s max delay
const input = document.querySelector('input[type="search"]')!;

input.addEventListener('input', async () => {
  await debouncer.wait(); // resets while typing; fires within 2s max
  // Trigger the expensive operation here
  console.log('Searching for:', input.value);
});
```

Alternatively, execute a function directly:

```ts
const saveDebouncer = new Debouncer(500);
window.addEventListener('resize', () => {
  saveDebouncer.debounce(() => {
    console.log('Resized!');
  });
});
```

### `class Stopwatch`: Measure performance with Stopwatch

```ts
import { Stopwatch } from '@trunkjs/browser-utils';

const sw = new Stopwatch('Render');
// ... do stuff
sw.lap('after step 1');
// ... do more stuff
sw.lap('after step 2');
console.debug('Total ms:', sw.stop());
```

### `class LoggingMixin`: Enable conditional logging in custom elements (LoggingMixin)

```ts
import { LoggingMixin } from '@trunkjs/browser-utils';

class MyEl extends LoggingMixin(HTMLElement) {
  connectedCallback() {
    // Only prints if the element has a truthy debug attribute
    this.log('connected');
    // Always prints
    this.warn('Heads up');
    this.error('Something went wrong?');
  }
}

customElements.define('my-el', MyEl);

// <my-el debug></my-el>        // enables debug logging
// <my-el debug="false"></my-el> // disables debug logging
// <my-el></my-el>               // debug logging disabled by default
```

Tip:
- If you toggle the debug attribute at runtime, call el.invalidateDebugCache() so the mixin re-evaluates the attribute on the next log/warn/error call.

### `class EventBindingsMixin`: Auto-bind event listeners in custom elements

This mixin handles automatic registration and removal of event listeners in custom elements. It uses the `@Listen` decorator to bind class methods to events on specified targets.

It will register the events in connectedCallback and remove them in disconnectedCallback.

```ts
import { EventBindingsMixin } from '@trunkjs/browser-utils';
import { Listen } from '@trunkjs/browser-utils';

class MyEl extends EventBindingsMixin(HTMLElement) {
    @Listen('click', { target: 'this' }) // listens to clicks on the element itself
    onClick(event: MouseEvent) {
        this.log('Element clicked', event);
    }

    @Listen('resize', { target: 'window' }) // listens to window resize events
    onResize(event: UIEvent) {
        this.log('Window resized', event);
    }
}
```

Target options:
- 'host': the custom element itself
- 'window': the global window object
- 'document': the global document object
- 'shadowRoot': the shadow root of the element (if any)
- `(element) => EventTarget`: a function returning any EventTarget (e.g. another DOM element)

### `async function waitForXYZ`: Promise-based event helpers

```ts
import { waitFor, waitForDomContentLoaded, waitForLoad, sleep, waitForAnimationEnd } from '@trunkjs/browser-utils';

await waitForDomContentLoaded(); // resolves when DOM is ready
await waitForLoad(); // resolves when all resources are loaded

// Wait for a specific event
const clickEvent = await waitFor<MouseEvent>(document.getElementById('btn')!, 'click');

// Pause execution
await sleep(250);

// Wait for CSS animation to finish
await waitForAnimationEnd(document.querySelector('.animate')!);
```




## API Reference
