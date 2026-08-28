---
name: browser-utils-usage
description: Use @trunkjs/browser-utils for browser-side DOM creation, timing, storage, breakpoints, typed event listeners, logging, loader coordination, and Lit/custom-element mixins. Do not use it for server-only code.
---

# Browser Utils Usage

Prefer the public exports from `@trunkjs/browser-utils` over local copies of equivalent browser helpers. Import from the package root; internal `src/` paths are not public API.

```ts
import { create_element, local_storage, waitForLoad } from '@trunkjs/browser-utils';
```

Choose the smallest API that matches the job:

- DOM nodes: `create_element`
- Burst control: `Debouncer` or `@debounce`
- Browser lifecycle and events: `waitFor*`, `sleep`
- JSON-like browser state: `local_storage`, `session_storage`
- Breakpoint inspection: `breakpoints`, `getCurrentBreakpoint`, `getBreakpointMinWidth`
- Custom elements: `EventBindingsMixin`, `LoggingMixin`, `BreakPointMixin`
- Lit elements: `LoaderMixin`, `SlotVisibilityMixin`

Read [references/helpers-and-storage.md](references/helpers-and-storage.md) for DOM, timing, storage, diagnostics, and breakpoint examples. Read [references/custom-elements-and-mixins.md](references/custom-elements-and-mixins.md) when implementing custom elements, Lit components, decorators, loader coordination, or slot handling.

## Package-specific constraints

- Use these APIs only where browser globals are available. Storage proxies tolerate SSR by remaining in memory, but DOM and lifecycle helpers require the browser.
- Treat storage values as JSON data. Functions, class instances, symbols, and cyclic objects are not supported.
- Let the event mixin own listener cleanup; do not add duplicate manual listeners for the same decorator.
- Use loader-aware waits only for visual startup coordination, not as a replacement for application data loading.
- Preserve native error behavior: for example, `getBreakpointMinWidth` throws for unknown names and `waitForLoad(image)` rejects when the image fails.
