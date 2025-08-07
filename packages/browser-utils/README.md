# @trunkjs/browser-utils

A small collection of browser-focused, framework-agnostic utilities that make common DOM and timing tasks easier. All utilities are written in TypeScript and ship as ES modules.

Exports:
- create_element: Minimal DOM element factory
- Debouncer: Debounce helper with optional max-delay
- Stopwatch: Lightweight performance timer with lap logging
- waitFor, waitForDomContentLoaded, waitForLoad, sleep, waitForAnimationEnd: Promise-based event and timing helpers
- LoggingMixin: Lightweight logging mixin for Custom Elements

## Installation

Within this monorepo, the package is consumed via path aliases. If you publish or consume it externally, import from the package name:

```ts
import {
  create_element,
  Debouncer,
  Stopwatch,
  waitFor,
  waitForDomContentLoaded,
  waitForLoad,
  sleep,
  waitForAnimationEnd,
  LoggingMixin,
} from '@trunkjs/browser-utils';
```

Note: Several utilities depend on browser globals (window, document, performance). Use them in browser-like environments.

## Quick start

### Create and append an element

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

### Debounce input handling

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

### Measure performance with Stopwatch

```ts
import { Stopwatch } from '@trunkjs/browser-utils';

const sw = new Stopwatch('Render');
// ... do stuff
sw.lap('after step 1');
// ... do more stuff
sw.lap('after step 2');
console.debug('Total ms:', sw.stop());
```

### Enable conditional logging in custom elements (LoggingMixin)

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

### Promise-based event helpers

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

### create_element(tag, attrs?, children?)

- Signature:
  - create_element(tag: string, attrs?: Record<string, string | true | null | undefined>, children?: (Node | string)[] | string | Node): HTMLElement
- Behavior:
  - Creates an element, sets provided attributes, and appends children.
  - children can be a single Node/string or an array.
  - Attribute values:
    - true → renders as a boolean attribute with an empty value (e.g. disabled="")
    - null/undefined → attribute is omitted
    - string → sets the attribute to the given string

Example:
```ts
create_element('input', { type: 'checkbox', checked: true });
```

### class Debouncer

- constructor(delay: number, max_delay: number | false = false)
  - delay: debounce window in ms
  - max_delay: maximum time a call may be deferred. If false, no max is applied.
- wait(): Promise<true>
  - Returns a promise that resolves after delay ms since the last call.
  - If max_delay is set and exceeded, the pending timer is not cleared and will resolve soon.
- debounce(callback: () => void): void
  - Schedules callback to run after delay ms since the last call.

Use cases:
- User input throttling (search boxes)
- Resize or scroll handlers
- Preventing excessive network calls

### class Stopwatch

- constructor(label: string, enabled: boolean = true)
- lap(msg?: string): void
  - Logs a lap line to console.debug in format: [label] msg +Xs
- elapsed(): number
  - Milliseconds since start
- reset(): void
- stop(): number
  - Stops the stopwatch and returns elapsed ms
- start(): void
  - Starts (or restarts) and resets timings
- isRunning(): boolean

Notes:
- Uses performance.now() for high-resolution timing
- If enabled is false, lap is a no-op

### LoggingMixin(Base)

- Signature:
  - LoggingMixin<TBase extends abstract new (...args: any[]) => object>(Base: TBase): class extends Base
- Adds methods and properties to your Custom Element base class:
  - log(...args: any[]): void
    - Logs to console.log only when debug is enabled.
  - warn(...args: any[]): void
    - Always logs to console.warn (independent of debug).
  - error(...args: any[]): void
    - Always logs to console.error (independent of debug).
  - get _debug(): boolean
    - Indicates whether debug logging is enabled for the instance.
  - invalidateDebugCache(): void
    - Clears the cached debug flag. Call this after changing the debug attribute dynamically.

How debug is determined:
- On first call to log/warn/error, the mixin checks the element’s debug attribute and caches the result.
- The attribute is considered truthy if present and not one of: "false", "0", "off", "no".
  - Examples:
    - <my-el debug></my-el> → debug ON
    - <my-el debug="true"></my-el> → debug ON
    - <my-el debug="false"></my-el> → debug OFF
    - <my-el></my-el> → debug OFF
- If you toggle the attribute at runtime, call invalidateDebugCache() so the next call re-evaluates it.

Usage:
```ts
class MyEl extends LoggingMixin(HTMLElement) {
  connectedCallback() {
    this.log('connected');  // prints only if debug is ON
    this.warn('warning');   // always prints
    this.error('error');    // always prints
  }
}
```

### waitFor<T>(target, eventName, options?)

- Signature:
  - waitFor<T>(target: EventTarget, eventName: string, options?: AddEventListenerOptions): Promise<T>
- Resolves with the event object T upon first occurrence.

### waitForDomContentLoaded()

- Resolves once the DOM is ready (DOMContentLoaded).
- If the document is already past loading, resolves immediately.

### waitForLoad()

- Resolves once the window load event fires.
- If the document is already complete, resolves immediately.

### sleep(ms)

- Signature: sleep(ms: number): Promise<void>
- Resolves after the given delay.

### waitForAnimationEnd(element)

- Signature: waitForAnimationEnd(element: HTMLElement): Promise<AnimationEvent>
- Resolves when the element fires animationend.

## Building

Run `nx build browser-utils` to build the library.

The library is configured for:
- ES module output
- TypeScript declaration generation via vite-plugin-dts
- Vite rollup bundling

## Running unit tests

Run `nx test browser-utils` to execute the unit tests via Vitest.

## Notes and caveats

- Environment: Some utilities require browser globals (window, document, performance). Use them in a DOM-capable environment (browser or a DOM-enabled test runner).
- Types: Debouncer uses NodeJS.Timeout type in typings; in browsers, the runtime value is still a timeout handle and works as expected.
- LoggingMixin: Designed for Custom Elements (HTMLElement or frameworks like Lit’s ReactiveElement). The debug attribute is cached for performance; call invalidateDebugCache() after toggling it dynamically. warn and error always log regardless of debug state.