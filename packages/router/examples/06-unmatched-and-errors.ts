// Complements 01; this import creates its application.
import { router } from './01-start';

console.log(router.match('/not-defined')); // null; route table has no such path.
console.log(router.navigate('/not-defined')); // null; URL, history and view stay unchanged.
console.log(router.match('https://another.example/users/42')); // null; foreign origin.
console.log(router.match('/users/%ZZ')); // null; invalid percent encoding.

// A missing parameter is a programming error, unlike a well-formed unmatched URL.
try {
  router.url({ name: 'user' });
} catch (error) {
  console.log((error as Error).message); // Missing route parameter id for user
}
// Unknown route names, duplicate names and empty/dot parameter values also throw.
// Auxiliary navigation requires an active primary route and a registered outlet route.

// Application-owned 404 handling for an incoming browser URL:
if (!router.match(window.location.href)) {
  document.body.textContent = 'Page not found';
}
// No catch-all, redirects, guards, nested route inheritance or hash-routing mode
// are implemented. match() can preflight a URL; it performs no authorization.
// Unmatched initial/popstate URLs do not emit routechange or clear an old view.
// Integrate your own popstate 404 handling if unrelated URLs share this app shell.
