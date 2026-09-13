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
- `navigate(target)` adds history; `replace(target)` replaces the current entry.
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
  navigation guards, nested route inheritance and scroll management are not included.
