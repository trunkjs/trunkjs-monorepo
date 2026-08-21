---
name: trunkjs-router-demo-reference
description: Define TrunkJS routes with `@route({ name, path })` on Web Components, pass them to `new Router([...])`, set the default router, call `router.start()`, and render them with `<router-content>`.
---

# TrunkJS Router

```ts
@route({ name: 'user', path: '/users/:id' })
class UserPage extends HTMLElement {}

const router = new Router([UserPage]);
setDefaultRouter(router);
router.start();
```

```html
<router-content></router-content>
```

Navigate with `router.navigate({ name: 'user', params: { id: 42 } })`; read params in `withRouter(...).onRouteChange({ route })` via `route.params`.
