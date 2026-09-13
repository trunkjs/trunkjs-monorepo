import { Router, route, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

@route({ name: 'user', path: '/users/:id', meta: { title: 'User profile' } })
class UserPage extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange) {
    this.textContent = `User ${route.params['id']}, tab ${route.query.get('tab') ?? 'profile'}`;
  }
}
customElements.define('example-user-page', UserPage);

// The decorator describes a route. Registration makes the element constructible;
// passing it to Router makes the route available. None of these steps navigates.
export const router = new Router([UserPage]);
setDefaultRouter(router);
document.body.innerHTML = '<router-content></router-content>';
router.start(); // Reads the current URL and starts handling links and Back/Forward.

// First visit to this example: replace its otherwise unmatched entry URL.
if (!router.current) router.replace({ name: 'user', params: { id: 42 } });

const link = document.createElement('a');
link.href = router.url({ name: 'user', params: { id: 7 }, query: { tab: 'history' } });
link.textContent = 'Open user 7 history';
document.body.append(link);
// Clicking the real link shows "User 7, tab history" without a document reload.
// url() alone only produces /users/7?tab=history; it does not navigate.
