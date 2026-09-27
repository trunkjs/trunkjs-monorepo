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
<tj-scroll-restore debug></tj-scroll-restore>
```

Each element logs its own status only while its `debug` attribute is present.
Warnings and errors remain visible. The attribute is checked for each message,
so it can be added or removed at runtime. Scroll restoration logs waiting,
restoration, anchor navigation, and saved positions.

## Lifecycle waits

`window.tj_loader_state` exposes the current loader phase through a read-only
getter. The browser-utils helpers `waitForReady()`, `waitForPreVisual()`, and
`waitForVisual()` resolve immediately when their phase has already been reached
or passed. Otherwise they wait for the corresponding event. A loader connected
after `DOMContentLoaded` also starts its readiness checks immediately.

The generic `waitFor(target, eventName)` helper waits for the next event; it
cannot determine whether an arbitrary event has already occurred.

## Scroll restoration

Place `tj-scroll-restore` next to `tj-loader` to restore the scroll position
on a full reload or HMR reload of the same URL. A different URL starts at the
top. Anchors are resolved after the loader reaches its visual phase, including
content rendered by client components. Without a loader, restoration waits for
window `load`. Scroll positions are kept in session storage for this tab.

```html
<tj-loader></tj-loader>
<tj-scroll-restore></tj-scroll-restore>
<!-- For a scrollable container instead of the document: -->
<!-- <tj-scroll-restore observe-scroll-element="#content"></tj-scroll-restore> -->
```

Use only one scroll restore element per page. Reserve space for late-loading
images or other content so their layout shifts do not move the restored view.

Same-page links use the browser's native anchor navigation. The component reads
`location.hash` on `hashchange` and scrolls the target into view after a hash
change; initial deep links are resolved after the loader becomes visual. To
make ordinary anchor navigation smooth and account for a fixed header, style
the document's scrolling element (or the selected scroll container):

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 4rem;
}
```

Alternatively, use `scroll-margin-top` on individual targets. Initial reload
restoration and deep links still jump immediately.
