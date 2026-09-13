import { Router, route, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

// Independent alternative to 01. The host application provides GET /api/users/:id
// returning a JSON object with a string "name"; the Router does not supply this API.
@route({ name: 'user', path: '/users/:id' })
class UserPage extends withRouter(HTMLElement) {
  #request?: AbortController;

  override async onRouteChange({ route, changed }: RouteChange) {
    if (!changed.primary) return; // A tab/hash change does not require this user record again.
    this.#request?.abort();
    const request = this.#request = new AbortController();
    this.textContent = 'Loading user…';
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(route.params['id'])}`, { signal: request.signal });
      if (!response.ok) throw new Error(`User request failed (${response.status})`);
      const user = await response.json();
      if (!request.signal.aborted) this.textContent = user.name;
    } catch (error) {
      // Router events do not await this callback or handle application request errors.
      if (!request.signal.aborted) this.textContent = error instanceof Error ? error.message : 'Cannot load user';
    }
  }

  override disconnectedCallback() {
    this.#request?.abort(); // Prevent a late response from updating an abandoned editor.
    super.disconnectedCallback(); // Removes the route subscription.
  }
}
customElements.define('lifecycle-user-page', UserPage);
const router = new Router([UserPage]);
setDefaultRouter(router);
document.body.innerHTML = '<router-content></router-content>';
router.start();
if (!router.current) router.replace({ name: 'user', params: { id: 42 } });
// Success displays the API's name; HTTP failures display their status.
// A router-aware toolbar can live outside router-content and use the same callback.
// If you override connectedCallback(), call super.connectedCallback() after setting
// up any DOM needed by onRouteChange: an existing route is delivered immediately.
