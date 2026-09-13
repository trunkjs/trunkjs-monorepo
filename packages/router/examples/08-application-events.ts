// Complements 01. Domain events belong to the application; Router stays domain-neutral.
import { RouteChangeEvent } from '@trunkjs/router';
import { router } from './01-start';

const subscriptions = new AbortController();

// This application defines user-selected with a numeric userId payload.
// Event registration does not navigate; receiving the event triggers navigation.
document.addEventListener('user-selected', (event) => {
  const { userId } = (event as CustomEvent<{ userId: number }>).detail;
  router.navigate({ name: 'user', params: { id: userId } });
}, { signal: subscriptions.signal });

const selectUser = document.createElement('button');
selectUser.textContent = 'Select user 7';
selectUser.addEventListener('click', () => {
  selectUser.dispatchEvent(new CustomEvent('user-selected', {
    detail: { userId: 7 }, bubbles: true, composed: true,
  })); // bubbles reaches document; composed also works across an open shadow boundary.
}, { signal: subscriptions.signal });
document.body.append(selectUser);
// Click -> user-selected -> /users/7 -> router-content displays User 7.

// Observe the completed navigation. Do not navigate back to the same route here:
// calling navigate() on every routechange would create a recursive event loop.
router.addEventListener(RouteChangeEvent.type, (event) => {
  const { route } = (event as RouteChangeEvent).detail;
  document.title = `User ${route.params['id']}`;
}, { signal: subscriptions.signal });

// Independent UI reaction: opening help does not represent a navigation/history entry.
const help = document.createElement('dialog');
help.textContent = 'Choose a user to open their profile. Press Escape to close.';
document.body.append(help);
document.addEventListener('help-requested', () => help.showModal(), { signal: subscriptions.signal });
const helpButton = document.createElement('button');
helpButton.textContent = 'Help';
helpButton.addEventListener('click', () => {
  helpButton.dispatchEvent(new Event('help-requested', { bubbles: true }));
}, { signal: subscriptions.signal });
document.body.append(helpButton);
// Click -> help-requested -> dialog opens; URL and router.current are unchanged.

// On application teardown, call subscriptions.abort() and remove this application's
// nodes. In a custom element, own the controller in connectedCallback and abort it
// in disconnectedCallback; create a new controller when reconnecting.
// For a shareable panel with Back/Forward support, handle its application event by
// calling navigateOutlet() instead; example 04 supplies the full outlet registration.
