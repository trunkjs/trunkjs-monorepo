# TrunkJS Router

Client-side routing for TrunkJS web components.

```ts
import { Router, route, setDefaultRouter, withRouter } from '@trunkjs/router';

@route({ name: 'user', path: '/users/:id', meta: { title: 'User' } })
class UserPage extends HTMLElement {}

const router = new Router([UserPage]);
setDefaultRouter(router);
router.start();
```

Use `<router-content></router-content>` as the route outlet. Decorated components are rendered for matching routes.

Components outside the outlet can subscribe through `withRouter`:

```ts
class Navigation extends withRouter(HTMLElement) {
  override onRouteChange({ route }) {
    console.log(route.params, route.meta);
  }
}
```

Generate and navigate by route name:

```ts
router.url({ name: 'user', params: { id: 42 } });
router.navigate({ name: 'user', params: { id: 42 } });
```

Routes use SPA navigation by default. Set `navigation: 'reload'` on a route or pass it to `navigate`/`replace` for a full page navigation. Internal anchor clicks are intercepted when they match a route; use `data-router-ignore` to opt out or `data-router-reload` to force a reload.
