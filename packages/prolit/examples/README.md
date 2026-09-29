# ProlitElement examples

The numbered TypeScript files define custom elements for use in your application. They contain no demo page, application entry point or mount/start wrappers. Imports use package names; local workspace aliases also work. The API example needs the server contract below; the other examples use local data.

For example, import `./01-light-dom-list` in your application and use `<example-todo-list heading="Today"></example-todo-list>` in its HTML. Router setup is shown below and dialog setup in [07](07-dialogs.md).

For application development, start with 01 for local state, 03 for route-owned data, 02 for HTTP reads/writes, and 07 for dialogs. [08](08-router-scope-review.md) compares these implemented APIs with explicitly marked proposals; its proposed imports/options are not available in the current packages. It is a design review, not an additional runnable component.

| Example | New question and visible result |
|---|---|
| [01 — Light-DOM task list](01-light-dom-list.ts) | How do I declare a reflected element attribute, bind input, show/hide content, loop over items, and react to clicks? `<example-todo-list heading="Today">` displays Today and adds/toggles tasks directly in light DOM. |
| [02 — API users](02-api-users.ts) | How do I fetch, search, submit, show pending/errors, and retry? GET loads users, POST creates one, and a successful save refreshes the list. |
| [03 — Router users](03-router-users.ts) | How does a ProlitElement become a declared route? `/users/42` displays Ada; the real link to `/users/7` displays Linus and updates history. Query-only tab changes retain the page. |
| [04 — Event bindings](04-event-bindings.ts) | What are the targets and lifecycle rules of `on()` and `@Listen`? The panel records host, document, window, custom-target and rendered-button events; example 06 adds the shadow-root target. |
| [05 — Template syntax](05-template-syntax.ts) | Where do the less common directives fit? The panel demonstrates keyed arrays, object keys, `*do`, `*catch`, `*log`, property/boolean/class/style bindings and explicit deep updates. |
| [06 — Shadow DOM only when needed](06-shadow-dom.md) | How do I embed an isolated widget? Explicit shadow-DOM opt-in, CSS via `?inline`, named slot and shadow-root events. |
| [07 — Pluggable dialog routes](07-dialogs.md) | One typed component inline, via `show()`, via a primary route or as a partial route. Flat grey renderer with close and size controls. |
| [08 — Router/Scope API review](08-router-scope-review.md) | Current versus proposed usage: deep links, route resources, query changes, writes and dialog lifecycle. Proposed APIs are not implemented. |

## 01 — A complete local flow

Each component uses `@customElement(...)` and a `protected override scope = scopeDefine({...})` instance property. Inside it, `$tpl` comes first as a plain string with `// language=HTML`, followed by state, callbacks and scope hooks. Constructors and element lifecycle/public methods follow only when needed. JetBrains supports this comment for [HTML language injection](https://www.jetbrains.com/help/webstorm/using-language-injections.html); it does not type-check Prolit expressions.

Every instance creates its own scope, resources and callbacks. Moving `scopeDefine(...)` into a module-level constant would share mutable state across all instances, even without exporting that constant. Keep the scope protected and expose deliberate element methods or attributes for external callers.

The first module defines `heading` as a Lit property reflected to an HTML attribute, initializes the inherited reactive `scope` field directly with an inferred instance-local scope, and uses the default light DOM without a render-root override. Its `updated()` hook copies later `heading` changes into the Prolit scope; assigning a scope field updates the template without an outer Lit render. The input's `@input` reads `$event.currentTarget.value`, `*if` shows the empty state, `*for` uses `todo.id` as a stable key, and `@click` calls `$fn.add()`. Array updates replace the root value, so adding or toggling a task rerenders automatically. Import the module and place `<example-todo-list heading="Today"></example-todo-list>` in the page. Existing children in a Lit light render root are managed by Lit; do not put unrelated content there.

## 02 — The API stub, HTTP contract and action result

Install `@trunkjs/api-stub` in the consuming application alongside `@trunkjs/prolit` and its Lit peers. Prolit Elements is no longer a separate workspace package.
[02-api.ts](02-api.ts) supplies a minimal typed `API` using `createApi` and `ApiRoute`;
it declares real HTTP endpoints, not mocked responses. In an application with generated
API types and routes, import that generated stub instead of maintaining a second contract.
The component imports `API` and `User` and calls `API.Users.List.request(...)` /
`API.Users.Create.request(...)` directly inside its scope.

`<example-api-users></example-api-users>` expects the host application's API:

| Request | Response |
|---|---|
| `GET /api/users?q=<encoded query>` | HTTP 2xx JSON array of `{ "id": "42", "name": "Ada" }` objects. |
| `POST /api/users` with JSON `{ "name": "Linus" }` | HTTP 2xx JSON object `{ "id": "7", "name": "Linus" }`. |

The component uses `scopeResource` for reads and `scopeAction` for the POST. The API stub builds the query string, serializes the JSON body, parses the response and rejects non-success HTTP responses; the component needs no fetch wrappers or response casts. Request bodies and response types are checked by TypeScript, while the server remains responsible for validating incoming data. `$hooks.$connect` starts the first read only after mounting. Search triggers `reload(query)` with `retainData: false`, so stale results are cleared. A new read supersedes the previous read and passes its `AbortSignal` to the stub through `options.signal`. The form uses `$event.preventDefault(); $fn.submit()`; `submit()` checks `result.status === 'success'` before clearing the draft or refreshing. Error and pending messages come from the operation that owns them. A failed POST leaves the draft intact; a failed refresh does not retry the POST. The server must validate the name independently of the native `required` control. For a runnable backend-free view, start with 01 or 03.

## 03 — Router ownership and navigation

`@route({ name: 'example-user', path: '/users/:id' })` declares the route, `withRouter(ProlitElement)` supplies `onRouteChange`, and `new Router([ExampleUserPage])` registers it. `setDefaultRouter`, `<router-content>` and `router.start()` activate browser navigation. The page uses a local two-user lookup to keep the example independent of the API server. Links are produced by `router.url(...)`; only clicking them navigates. `onRouteChange` updates `userId` and the query-derived tab. The initial route may be delivered before the directive mounts, so `$hooks.$connect` starts the initial resource read; later ID changes reload explicitly. A query-only change updates the tab without repeating the user read. The router owns URL/history and component mounting; the scope owns request state. Stop the router when tearing down the application. An application must serve its shell at deep links such as `/users/7`.

Include these outlets in your application HTML:

```html
<router-content></router-content>
```

Then register and start the router in your application, after the body exists:

```ts
import { Router, setDefaultRouter } from '@trunkjs/router';
import { ExampleUserPage } from './03-router-users';

const router = new Router([ExampleUserPage]);
setDefaultRouter(router);
router.start();
```

Open `/users/42?tab=history` to see Ada and the history tab. Do not unconditionally replace the URL after `start()`: incoming deep links must be preserved. An unmatched application root requires an explicit application route or fallback, not a redirect that overwrites every incoming address. Open `/users/99` to inspect the public error and retry the current ID; retrying an ID absent from the local dataset still fails. [08](08-router-scope-review.md) explains the current mount coordination and a proposed optional adapter that would remove it from application code.

## 04 — Event registration choices

The Prolit `@click` expression is best for actions on nodes generated by the scope template. `on()` and `@Listen` are for DOM and application events outside that expression. `ProlitElement` already includes `EventBindingsMixin`; you do not wrap it again. The mixin attaches constructor-registered callbacks on connection, automatically deregisters them on disconnect, and attaches them once on reconnect. Late calls attach immediately. `on()` returns `off()` for permanent removal, including future reconnects.

| Target option | Example use |
|---|---|
| omitted or `'host'` | Capture a click on the custom element. |
| `'window'` | Handle resize with `{ options: { passive: true } }`. |
| `'document'` | Receive typed `example:note` or use `@Listen('keydown', ...)`. |
| `'shadowRoot'` | Example 06 only: listen within an explicitly enabled shadow root. |
| `EventTarget` | Listen to the component's explicit `bus`. |
| `(host) => EventTarget` | Resolve a rendered button after `firstUpdated()` and again on reconnect. |

Examples 04 and 06 need a constructor for `on()` registration; scope initialization remains a class field in every component. `options` also accepts native `capture` and `once`; `once` applies per connection, whereas `off()` removes the saved registration. The mixin owns the abort signal, so `on()` does not accept `options.signal`. `@Listen` supports both the project's legacy decorators and standard TypeScript method decorators. To try the custom event and explicit disposal after mounting 04:

```ts
const panel = document.querySelector('example-event-panel') as ExampleEventPanel;
document.dispatchEvent(new CustomEvent('example:note', { detail: { message: 'News' } }));
const off = panel.listenTemporarily();
panel.dispatchEvent(new Event('example:temporary'));
off(); // A later example:temporary event has no effect, even after reconnect.
```

Import `ExampleEventPanel` from [04-event-bindings.ts](04-event-bindings.ts) for the type. The custom `DocumentEventMap` declaration there gives `event.detail.message` its type. Read the [Browser Utils reference](../../browser-utils/skills/browser-utils-usage/references/custom-elements-and-mixins.md) for a general custom-element integration.

## 05 — Template expression map

| Syntax | In 05 | Effect |
|---|---|---|
| `{{ expression }}` | Text and quoted `title` attribute | Evaluates against the scope. |
| `@event` and `$event` | Input and buttons | Runs statements synchronously with the DOM event available. Return the final Promise when calling async work. |
| `.property` / `?attribute` | `.value` / `?disabled` | Sets a DOM property / toggles a boolean attribute. |
| `~class` / `~style` | Active class and accent color | Supplies objects to Lit's class/style maps. |
| `*if` / `*for` | Details and keyed items or `key in counts` | Conditional display and array/object iteration; `$index` is available in loops. |
| `*do` | Local `total` for the item count | Runs scoped setup before rendering children. |
| `*catch` | Details block | Catches template evaluation errors for that block; it does not handle HTTP failures. |
| `*log` | Item count | Logs during rendering for development; remove it from production templates. |

Structural attributes are applied left to right; avoid relying on duplicate attributes of the same name in browser-parsed HTML. Direct scope assignments update automatically; `markFirst()` demonstrates `$update()` for an in-place nested mutation. For production code, replacing the root array is generally clearer. `$ref` is not supported by the current Lit environment. Legacy `$on` and hook names other than `$connect` do not run the new directive lifecycle. Templates are trusted executable code: pass API values through scope fields, never concatenate them into template source. TypeScript checks callbacks in the scope but does not typecheck expressions inside `prolit_html` strings.

## 06 — Shadow DOM is an explicit exception

Ordinary application components render in light DOM and inherit the application stylesheet.
Use `static override useShadowDom = true` only when requested or when an embedding boundary needs style isolation.
See [the component and CSS explanation](06-shadow-dom.md); its stylesheet uses a Vite `?inline` import and Lit's `static styles`.
The renderer choice does not change scope ownership or event cleanup.
