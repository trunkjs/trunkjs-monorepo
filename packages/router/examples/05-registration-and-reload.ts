import { Router, route, setDefaultRouter } from '@trunkjs/router';

// Independent alternative: decorators describe a shared layout by route name.
@route({ name: 'settings', path: '/settings' })
class SettingsPage extends HTMLElement {
  connectedCallback() { this.textContent = 'Settings'; }
}
@route({ name: 'settings', path: '/settings', outlet: 'sidebar' })
class SettingsNavigation extends HTMLElement {
  connectedCallback() { this.textContent = 'Account navigation'; }
}
customElements.define('example-settings', SettingsPage);
customElements.define('example-settings-nav', SettingsNavigation);
const router = new Router([SettingsPage, SettingsNavigation]);

// addRoute is the alternative to decorators, not an additional registration of
// the same named route. A reload route delegates to the server on navigation.
router.addRoute({ name: 'legacy', path: '/legacy/:id', navigation: 'reload' });
setDefaultRouter(router);
document.body.innerHTML = `
  <router-content name="sidebar"></router-content><router-content></router-content>
  <a href="/settings">Settings without reload</a>
  <a href="/settings" data-router-reload>Settings with document reload</a>
  <a href="/legacy/42">Server-rendered legacy page</a>
  <a href="/settings" data-router-ignore>Let the browser handle this link</a>
  <a href="/settings" download>Download instead of SPA navigation</a>`;
router.start();
if (!router.current) router.replace({ name: 'settings' });
// Settings and Account navigation appear in separate outlets.
// The server must serve /settings on refresh and provide /legacy/42 for that link.
// For one programmatic full reload, use:
// router.navigate({ name: 'settings' }, { navigation: 'reload' });
// router.stop() removes this router's click/popstate handlers; it does not remove
// the mounted components or disable explicit navigate()/replace() calls.
