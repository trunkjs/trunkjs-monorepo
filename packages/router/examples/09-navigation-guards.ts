// Independent example: register your page components as in 01-start.ts.
import { session_storage } from '@trunkjs/browser-utils';
import { Router, setDefaultRouter } from '@trunkjs/router';

const session = session_storage('router-example', { visited: false });
const router = new Router([
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
]);
setDefaultRouter(router);

// First access within this browser-tab session; reload keeps the marker.
router.beforeEach(() => {
  if (!session.visited) {
    session.visited = true;
    alert('Willkommen, erster Zugriff!');
  }
  return true;
});

// Only a real full-page reload produces this alert, not an initial visit.
const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
if (navigation?.type === 'reload') alert('Browserseite wurde neu geladen.');

await router.start();

// This alert is only for changes between pages after the first route.
router.beforeEach((to, from) => {
  if (from && to.path !== from.path) alert(`Seitenwechsel: ${from.path} → ${to.path}`);
  return true;
});

// Navigating here triggers the page-change alert, but not the reload alert.
await router.navigate('/about');
