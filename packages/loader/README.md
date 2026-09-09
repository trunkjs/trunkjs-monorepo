# loader

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build loader` to build the library.

## Running unit tests

Run `nx test loader` to execute the unit tests via [Vitest](https://vitest.dev/).

## Ordered startup levels

Register levels before `<tj-loader>` reaches `DOMContentLoaded`. Each `start`
callback may return a promise and may add further fulfillment promises through
`waitUntil`. Existing components using `LoaderMixin` are counted automatically
inside the currently active level.

```ts
import { loaderRunLevels } from '@trunkjs/loader';

loaderRunLevels
  .register({
    name: 'structure',
    selector: 'tj-content-pane',
    visualStage: 'hidden',
    start: () => import('@trunkjs/content-pane'),
  })
  .register({
    name: 'layout',
    selector: 'tj-responsive',
    visualStage: 'measurable',
    start: () => import('@trunkjs/responsive'),
  });
```

`selector` skips a level when the page does not contain a matching element.
The default settle window is 100 ms and the default hard timeout is 4 seconds.
Both can be changed per level with `settleMs` and `timeoutMs`. A timeout or
rejected fulfillment logs an error, emits `loader:run-level-complete`, and lets
the following level continue.

The loader exposes `data-loader-run-level` and `data-loader-visual-stage` for
page-specific reveal CSS. The visual stages are `hidden`, `measurable`, and
`visible`; the existing `ready`, `pre-visual`, and `visual` classes and events
remain available.
