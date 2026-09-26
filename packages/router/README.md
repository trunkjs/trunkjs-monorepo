# TrunkJS Router

Open a user page, then navigate with a normal link:

```ts
import { Router, route, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

@route({ name: 'user', path: '/users/:id' })
class UserPage extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    this.textContent = `User ${route.params['id']}`;
  }
}
customElements.define('app-user-page', UserPage);

const router = new Router([UserPage]);
setDefaultRouter(router);
document.body.innerHTML = '<router-content></router-content><a href="/users/7">User 7</a>';
router.start();
if (!router.current) router.replace({ name: 'user', params: { id: 42 } });
// Displays User 42 on the example entry URL; clicking the link displays User 7.
```

Run after the body exists. `@route` describes the route, `customElements.define`
registers its component, and `new Router([...])` registers the route. The default
router connects `withRouter` components and `<router-content>`; `start()` reads
the URL and enables link/history handling. Existing connected elements bind when
`setDefaultRouter` runs. When replacing an active router, stop the old instance
before binding/starting another one.

Read the [numbered example series](examples/README.md) for navigation, lifecycle,
fixed and auxiliary outlets, reloads, error behavior and the MICX Page Builder.

- `url(target)` generates a link; `match(url)` inspects it without navigating.
- `await navigate(target)` adds history; `await replace(target)` replaces the current entry. Both resolve to the committed route or `null` when blocked/unmatched.
- Required parameters and query values are explicit, never inherited silently.
- Unmatched SPA targets return `null` and leave URL/view unchanged; malformed
  input URLs also match as `null`. Missing parameters and unknown names throw.
- Query/hash changes retain mounted route components and invoke `onRouteChange`.
  Primary route/parameter changes replace outlet components. Auxiliary navigation
  updates its outlet without replacing unchanged primary components.
- `withRouter` subscribes on connect and unsubscribes on disconnect. Handle async
  errors/cancellation in application callbacks; Router does not await them.
- Real internal links support SPA navigation, including links in open shadow DOM.
  Modifier clicks, download links and external links retain browser behavior.
  Use `data-router-reload`, `data-router-ignore`, or `navigation: 'reload'` when needed.
- The server must serve the application shell at deep links. Fallback pages,
  nested route inheritance and scroll management are not included.

## Dirty navigation

Views or save plugins report the current route's unsaved state by dispatching
`RouteDirtyEvent(true)` and, after a successful save, `RouteDirtyEvent(false)`.
The event bubbles and crosses shadow DOM; dispatch it from a connected element.
A normal link needs no dirty attribute or handler. The Router listens while
started and guards matched links, query changes, programmatic navigation and
Back/Forward. It clears the state after a committed URL change, retains it when
navigation is canceled, and clears it on `stop()`.

```ts
import { RouteDirtyEvent } from '@trunkjs/router';

editor.addEventListener('input', () => editor.dispatchEvent(new RouteDirtyEvent(true)));
editor.addEventListener('saved', () => editor.dispatchEvent(new RouteDirtyEvent(false)));
```

The default confirmation is `window.confirm`. Configure one custom synchronous or
asynchronous dialog callback for the event state if needed:

```ts
router.setDirtyConfirmation(async ({ from, to, source }) =>
  showLeaveConfirmation({ from, to, source }));
```

`showLeaveConfirmation` is the application's dialog adapter, not a Router export.
See [09 — Dirty editor navigation](examples/09-dirty-navigation.ts) for a complete
example with an input, a save event, a normal link and a native `<dialog>`.
Dispatch `false` before manually removing a dirty editor without navigating.
For independent or conditional checks, `addDirtyCheck(isDirty, confirm?)` remains
available and returns a lifecycle disposer. Do not register the same unsaved
state in both mechanisms, or it can prompt twice.

For links and `navigate`/`replace`, the URL is committed after confirmation.
A rejected Back/Forward traversal is reversed to the previous router-owned
history entry. The browser can briefly show the target URL while an asynchronous
Back/Forward confirmation is pending. History entries created by unrelated code
have no router index; on rejection the Router restores the visible URL, but cannot
restore that foreign entry's exact history position. Use Router methods for
application navigation.

Navigation methods, including outlet navigation, now return
`Promise<RouteContext | null>`. Await them before reading the result or doing
success-dependent work. `back()` and `forward()` still request a browser
traversal and return void. A confirmation callback that throws rejects a
programmatic navigation; browser link and history handlers log the error and
leave the current route unchanged. Full document navigation outside matched
application links remains browser-owned.
