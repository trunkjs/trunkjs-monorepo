// Complements 01: importing it sets up the application and exports its router.
import { router } from './01-start';

const next = router.navigate({ name: 'user', params: { id: 7 }, query: { tab: 'history' } });
console.log(next?.params['id']); // "7"; the URL and displayed user have changed.

// Query/hash changes keep the current UserPage instance and call onRouteChange.
// Supply the complete target: params and query are not inherited implicitly.
router.replace({ name: 'user', params: { id: 7 }, query: { tab: 'profile' }, hash: 'details' });
// /users/7?tab=profile#details; replaces this history entry, rather than adding one.
// Hash is route state; this package does not implement scrolling to an element.

const href = router.url({ name: 'user', params: { id: 42 }, query: { tab: 'history' } });
console.log(href); // /users/42?tab=history — useful for normal anchors or sharing.
console.log(router.match(href)?.meta['title']); // "User profile"; match() does not navigate.

// Call router.back() / router.forward() in your own navigation button handlers.
// They request browser history traversal; the resulting routechange arrives later.
