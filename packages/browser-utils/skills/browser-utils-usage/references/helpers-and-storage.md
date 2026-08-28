# Browser Helpers and Storage

Use these examples for ordinary browser code that does not need a custom-element mixin.

## Create DOM elements

`create_element` accepts string attributes, boolean attributes, and text or `Node` children. `true` creates an empty boolean attribute; `null` and `undefined` omit it.

```ts
import { create_element } from '@trunkjs/browser-utils';

const icon = create_element('span', { class: 'icon', 'aria-hidden': 'true' }, '✓');
const button = create_element(
  'button',
  { type: 'button', class: 'button primary', disabled: true },
  [icon, ' Save'],
);

document.querySelector('#actions')?.append(button);
```

Use standard DOM APIs when a typed specialized element or property assignment is needed; `create_element` returns `HTMLElement` and sets attributes rather than element properties.

## Debounce repeated work

Use one `Debouncer` instance per independent operation. `max_delay` guarantees progress while calls keep arriving.

```ts
import { Debouncer } from '@trunkjs/browser-utils';

const input = document.querySelector<HTMLInputElement>('#search')!;
const debouncer = new Debouncer(250, 1500);

input.addEventListener('input', async () => {
  await debouncer.wait();
  updateResults(input.value);
});
```

For class methods using standard TypeScript decorators, use `@debounce`. A delayed invocation cannot return the original synchronous result, so use it for `void` methods.

```ts
import { debounce } from '@trunkjs/browser-utils';

class SearchController {
  @debounce(250, 1500)
  update(query: string): void {
    renderResults(query);
  }
}
```

## Wait for events and browser lifecycle

`waitFor` resolves with the first event and then removes its listener.

```ts
import { waitFor } from '@trunkjs/browser-utils';

const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
dialog.showModal();

const event = await waitFor<MouseEvent>(dialog, 'click', { capture: true });
console.log(event.clientX, event.clientY);
```

Wait for the DOM, full page, an image, media data, or a generic element load:

```ts
import { waitForDomContentLoaded, waitForLoad } from '@trunkjs/browser-utils';

await waitForDomContentLoaded();
await waitForLoad();

const image = document.querySelector<HTMLImageElement>('img.hero')!;
try {
  await waitForLoad(image);
} catch {
  image.replaceWith(document.createTextNode('Preview unavailable'));
}
```

Wait for CSS animation completion or introduce an explicit delay:

```ts
import { sleep, waitForAnimationEnd } from '@trunkjs/browser-utils';

panel.classList.add('is-closing');
await waitForAnimationEnd(panel);
panel.hidden = true;

await sleep(200);
```

## Persist JSON-like state

Storage helpers return a typed proxy. Reading initializes known keys from the supplied defaults; writing or deleting a property persists the whole object. Stored unknown keys are ignored when the proxy is created.

```ts
import { local_storage, session_storage } from '@trunkjs/browser-utils';

const preferences = local_storage('dashboard.preferences', {
  theme: 'system' as 'light' | 'dark' | 'system',
  compact: false,
});

preferences.theme = 'dark';
preferences.compact = true;
console.log({ ...preferences });

const draft = session_storage('contact.draft', { subject: '', message: '' });
draft.subject = 'Support request';
```

Malformed stored JSON falls back to the initial value. Quota and storage-security errors are ignored, leaving the proxy usable in memory. Use a new versioned key or migrate explicitly when the data shape changes substantially.

## Inspect breakpoints

The package uses `xs`, `sm`, `md`, `lg`, `xl`, and `xxl` with Bootstrap-compatible minimum widths.

```ts
import {
  breakpoints,
  getBreakpointMinWidth,
  getCurrentBreakpoint,
  getViewportWidth,
} from '@trunkjs/browser-utils';

console.log(getCurrentBreakpoint());
console.log(getCurrentBreakpoint(1024)); // "lg"
console.log(getBreakpointMinWidth('xl')); // 1200
console.table(breakpoints);
console.log(getViewportWidth());
```

Do not pass arbitrary names to `getBreakpointMinWidth`; unknown names throw.

## Diagnostics

Use `Stopwatch` for lightweight browser timing and `getErrorLocation` when presenting the best available file/line information from cross-browser errors.

```ts
import { getErrorLocation, Stopwatch } from '@trunkjs/browser-utils';

const timing = new Stopwatch('hydrate', import.meta.env.DEV);
hydratePage();
timing.lap('DOM hydrated');
console.debug('Total milliseconds:', timing.stop());

try {
  runUserScript();
} catch (error) {
  if (error instanceof Error) {
    console.error('User script failed', getErrorLocation(error));
  }
}
```

`Logger` is also public for non-element code. For custom elements, prefer `LoggingMixin` so messages include element identity and debug state.
