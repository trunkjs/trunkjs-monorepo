import { Router, route, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

// All three components describe the same route. The router merges them by
// route name and renders each component into its declared outlet.
@route({ name: 'user', path: '/users/:id' })
class UserPage extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    console.log('main', route.params.id);
  }
}

@route({ name: 'user', path: '/users/:id', outlet: 'sidebar' })
class UserSidebar extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    console.log('sidebar', route.params.id);
  }
}

@route({ name: 'user', path: '/users/:id', outlet: 'actions' })
class UserActions extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    console.log('actions', route.params.id);
  }

  nextUser() {
    this.router.navigate({
      name: 'user',
      params: { id: Number(this.params.id) + 1 },
    });
  }
}

customElements.define('user-page', UserPage);
customElements.define('user-sidebar', UserSidebar);
customElements.define('user-actions', UserActions);

const router = new Router([UserPage, UserSidebar, UserActions]);
setDefaultRouter(router);
router.start();

// Markup:
// <router-content name="sidebar"></router-content>
// <router-content></router-content> <!-- default outlet -->
// <router-content name="actions"></router-content>

router.navigate({ name: 'user', params: { id: 42 } });
