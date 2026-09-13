---
name: trunkjs-router-reference
description: Use TrunkJS routing: decorate page components with `@route`, use `withRouter` + `onRouteChange` for route state, render with `<router-content>` / named outlets, and navigate through `Router`.
---

# Router reference

```ts
@route({ name: 'user', path: '/users/:id' })
class UserPage extends withRouter(HTMLElement) {
  onRouteChange({ route }: RouteChange) {
    console.log(route.params.id);
  }
}

const router = new Router([UserPage]);
setDefaultRouter(router);
router.start();
router.navigate({ name: 'user', params: { id: 42 } });
```

```html
<router-content></router-content>
<router-content name="sidebar"></router-content>
```

Auxiliary outlets use `AuxiliaryRoute` and URLs such as `/users/42(sidebar:details/7)`.
