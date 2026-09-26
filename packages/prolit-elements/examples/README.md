# ProlitElement examples

Open the examples in order. Each TypeScript file is a complete custom-element module with a `mount...()` function; [index.html](index.html) loads one module into `#app`. From the monorepo root, run `npx nx serve prolit-elements`, then open `http://localhost:4000/examples/index.html?example=01`. The package source is available through the workspace aliases. Example 06 is a copyable Nextrap integration for an application with those packages installed; it is not loaded by this gallery. The API example needs the server contract below; without it, its visible read error is expected. The router example changes the URL to `/users/42`; serving that deep link after a reload requires an application-shell fallback.

| Example | New question and visible result |
|---|---|
| [01 — Light-DOM task list](01-light-dom-list.ts) | How do I declare a reflected element attribute, bind input, show/hide content, loop over items, and react to clicks? `<example-todo-list heading="Today">` displays Today and adds/toggles tasks directly in light DOM. |
| [02 — API users](02-api-users.ts) | How do I fetch, search, submit, show pending/errors, and retry? GET loads users, POST creates one, and a successful save refreshes the list. |
| [03 — Router users](03-router-users.ts) | How does a ProlitElement become a declared route? `/users/42` displays Ada; the real link to `/users/7` displays Linus and updates history. Query-only tab changes retain the page. |
| [04 — Event bindings](04-event-bindings.ts) | What are the targets and lifecycle rules of `on()` and `@Listen`? The panel records host, shadow, document, window, custom-target and rendered-button events. |
| [05 — Template syntax](05-template-syntax.ts) | Where do the less common directives fit? The panel demonstrates keyed arrays, object keys, `*do`, `*catch`, `*log`, property/boolean/class/style bindings and explicit deep updates. |
| [06 — NTE modal and offcanvas](06-nextrap-dialog.md) | How do I use a ProlitElement in a typed programmatic NTE modal or offcanvas? A nested editor keeps its scope, while the modal returns a typed result. |

## 01 — A complete local flow

The examples import `prolit_html as html` and declare `const template = html\`...\`` above each class. This preserves Prolit parsing and enables HTML tagged-template highlighting in supporting editors; editor setup determines the colors.

The first module defines `heading` as a Lit property reflected to an HTML attribute, initializes the inherited reactive `scope` field directly with an inferred instance-local scope, and returns `this` from `createRenderRoot()` for light DOM. Its `updated()` hook copies later `heading` changes into the Prolit scope; assigning a scope field updates the template without an outer Lit render. The input's `@input` reads `$event.currentTarget.value`, `*if` shows the empty state, `*for` uses `todo.id` as a stable key, and `@click` calls `$fn.add()`. Array updates replace the root value, so adding or toggling a task rerenders automatically. Mount with `mountTodoList(document.body)` or use the gallery. Existing children in a Lit light render root are managed by Lit; do not put unrelated content there.

## 02 — The HTTP contract and action result

`mountApiUsers(document.body)` expects the host application's API:

| Request | Response |
|---|---|
| `GET /api/users?q=<encoded query>` | HTTP 2xx JSON array of `{ "id": "42", "name": "Ada" }` objects. |
| `POST /api/users` with JSON `{ "name": "Linus" }` | HTTP 2xx JSON object `{ "id": "7", "name": "Linus" }`. |

The component uses `scopeResource` for reads and `scopeAction` for the POST. `$hooks.$connect` starts the first read only after mounting. Search triggers `reload(query)` with `retainData: false`, so stale results are cleared. A new read supersedes the previous read and passes `AbortSignal` to `fetch`. The form uses `$event.preventDefault(); $fn.submit()`; `submit()` checks `result.status === 'success'` before clearing the draft or refreshing. Error and pending messages come from the operation that owns them. A failed POST leaves the draft intact; a failed refresh does not retry the POST. The server must validate the name independently of the native `required` control. For a runnable backend-free view, start with 01 or 03.

## 03 — Router ownership and navigation

`@route({ name: 'example-user', path: '/users/:id' })` declares the route, `withRouter(ProlitElement)` supplies `onRouteChange`, and `new Router([ExampleUserPage])` registers it. `setDefaultRouter`, `<router-content>` and `router.start()` activate browser navigation. The page uses a local two-user lookup to keep the example independent of the API server. Links are produced by `router.url(...)`; only clicking them navigates. `onRouteChange` updates `userId` and the query-derived tab. The initial route may be delivered before the directive mounts, so `$hooks.$connect` starts the initial resource read; later ID changes reload explicitly. A query-only change updates the tab without repeating the user read. The router owns URL/history and component mounting; the scope owns request state. Stop the returned router when tearing down this example. An application must serve its shell at deep links such as `/users/7`.

## 04 — Event registration choices

The Prolit `@click` expression is best for actions on nodes generated by the scope template. `on()` and `@Listen` are for DOM and application events outside that expression. `ProlitElement` already includes `EventBindingsMixin`; you do not wrap it again. The mixin attaches constructor-registered callbacks on connection, automatically deregisters them on disconnect, and attaches them once on reconnect. Late calls attach immediately. `on()` returns `off()` for permanent removal, including future reconnects.

| Target option | Example use |
|---|---|
| omitted or `'host'` | Capture a click on the custom element. |
| `'window'` | Handle resize with `{ options: { passive: true } }`. |
| `'document'` | Receive typed `example:note` or use `@Listen('keydown', ...)`. |
| `'shadowRoot'` | Listen to events bubbling within the rendered shadow tree. |
| `EventTarget` | Listen to the component's explicit `bus`. |
| `(host) => EventTarget` | Resolve a rendered button after `firstUpdated()` and again on reconnect. |

Only the event example needs a constructor, because it calls `on()`; the other examples initialize `override scope` as a class field. `options` also accepts native `capture` and `once`; `once` applies per connection, whereas `off()` removes the saved registration. The mixin owns the abort signal, so `on()` does not accept `options.signal`. `@Listen` supports both the project's legacy decorators and standard TypeScript method decorators. To try the custom event and explicit disposal after mounting 04:

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
