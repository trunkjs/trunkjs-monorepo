# loader

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build loader` to build the library.

## Running unit tests

Run `nx test loader` to execute the unit tests via [Vitest](https://vitest.dev/).

## Debugging

Add the boolean `debug` attribute to enable normal loader status messages:

```html
<tj-loader debug></tj-loader>
```

Without this attribute, status messages are silent. Warnings and errors are
always logged. The attribute is checked for each message, so it can be added or
removed at runtime.

## Lifecycle waits

`window.tj_loader_state` exposes the current loader phase through a read-only
getter. The browser-utils helpers `waitForReady()`, `waitForPreVisual()`, and
`waitForVisual()` resolve immediately when their phase has already been reached
or passed. Otherwise they wait for the corresponding event. A loader connected
after `DOMContentLoaded` also starts its readiness checks immediately.

The generic `waitFor(target, eventName)` helper waits for the next event; it
cannot determine whether an arbitrary event has already occurred.
