import { Router, route, setDefaultRouter } from '@trunkjs/router';

@route({ name: 'home', path: '/' })
class HomePage extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<h1>Home</h1><a href="/users/42?tab=history">Open user 42</a>`;
  }
}

@route({ name: 'user', path: '/users/:id', meta: { title: 'User' } })
class UserPage extends HTMLElement {
  connectedCallback() {
    this.textContent = 'User route';
  }
}

customElements.define('router-demo-home', HomePage);
customElements.define('router-demo-user', UserPage);

export const router = new Router([HomePage, UserPage]);
setDefaultRouter(router);
router.start();
