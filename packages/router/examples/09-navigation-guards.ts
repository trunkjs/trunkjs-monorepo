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
  if (!session.visited) {
    session.visited = true;
    alert('Willkommen, erster Zugriff!');
  } else {
    // A reload in the same tab reaches this branch and blocks all routing.
    alert('Zweiter Zugriff verboten!');
    throw new Error('Zweiter Zugriff verboten');
  }
});

router.beforeEach((to) => {
  alert(`Routing nach ${to.path}`);
});

try {
  await router.start();
} catch (error) {
  // A thrown startup error rejects start(); no route is activated.
  console.error('Router-Start abgebrochen:', error);
}

// Await is only needed if code after navigation depends on its result:
// const next = await router.navigate('/about');
