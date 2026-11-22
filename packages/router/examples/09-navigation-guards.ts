// Independent example: register the page components as in 01-start.ts.
import { session_storage } from '@trunkjs/browser-utils';
import { Router, setDefaultRouter } from '@trunkjs/router';

const session = session_storage('router-example', { visited: false });
const router = new Router([
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
]);
setDefaultRouter(router);

router.beforeStart(() => {
  // First document load within this tab's session.
  if (!session.visited) {
    session.visited = true;
    alert('Willkommen, erster Zugriff!');
  } else {
    // Runs again on a page reload, but not during SPA navigation.
    alert('Willkommen zurück – Seite erneut geladen!');
  }
});

router.beforeEach((to) => {
  alert(`Routing nach ${to.path}`);
});

await router.start();

// Await is only needed if code after navigation depends on its result:
// const next = await router.navigate('/about');
