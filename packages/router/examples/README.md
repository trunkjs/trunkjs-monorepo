# Router examples

Start with [01 — Open a user page](01-start.ts): define and register a component,
connect the router, start browser navigation and generate a real link. Clicking
it changes both the URL and visible user. This is a browser TypeScript example;
use the repository's Vite application setup with standard decorators and the
public `@trunkjs/router` entrypoint.

| Read next | Question answered |
| --- | --- |
| [02 — Navigation](02-navigation.ts) | How do I build links, replace history, and change query/hash state? |
| [03 — Route lifecycle](03-route-lifecycle.ts) | Where do I load data, handle failures and cancel obsolete requests? |
| [04 — Outlets](04-outlets.ts) | How can an inspector navigate without destroying the editor? |
| [05 — Registration and reload](05-registration-and-reload.ts) | How do shared layouts, explicit route definitions and server navigation work? |
| [06 — Unmatched URLs and errors](06-unmatched-and-errors.ts) | What returns null, what throws, and which features remain application-owned? |
| [07 — MICX Page Builder](07-page-builder.ts) | Can the existing tenant URLs and page/language/file selection be represented? |
| [08 — Application events](08-application-events.ts) | How do events navigate, observe navigation, or show UI without changing the URL? |

Examples 02, 06 and 08 import and extend 01; the other modules are independent
alternatives. Load one entry module at a time, after the body exists. They replace
the example page's body. They are source examples, not an installed application or
an automatic migration. No optional router configuration is needed for the default
SPA case. Route components must be registered custom elements before rendering.

## Page Builder compatibility

Reviewed `micx-io/micx-pagebuilder`: `www/page.html`, `www/cjs/router.js`,
`www/cjs/api.js`, the four `www/pages/` views and `www/elements/navbar.html`.

| Current behavior | New API / migration consequence |
| --- | --- |
| `/e/{sub_id}/{site_id}` and `/page`, `/translation`, `/edit-data` | Use the same paths with `:sub_id` / `:site_id`; all four are represented in 07. |
| `ka_href()` inherits tenant params | Pass `params: site` explicitly; omitted required parameters throw. |
| `KaToolsV1.route.search` is captured at page load | Read `route.query` inside `onRouteChange`, including query-only navigation. |
| `pid`, `lang`, `file` select editor data | Keep them in query parameters. Slashes in `pid` round-trip as data. |
| `ka_goto()` reloads the document | Default navigation is SPA. Use reload mode only while retaining reload-dependent views. |
| `api_call()` reads global tenant params | A port must build requests from the current route/site context, preserving `/v1/pagebuilder/{sub_id}/{site_id}/...`. |
| `ka-include` executes scripts and `ka_define` registers global elements | These HTML fragments are not Router components. Port them to registered, lifecycle-aware components; repeated script evaluation can duplicate registrations/listeners. |
| Page/language switch creates a fresh document | SPA query changes preserve the editor; use onRouteChange to switch data and explicitly handle unsaved edits. |
| Async editor load | Cancel stale requests and clean up editor/event resources, as in 03. |
| Navbar, API-info provider and publish/pull actions are global | Rebind site-dependent state when tenant params change; Router does not supply data/session management. |

The URL model fits. The current MICX app is **not ready for a drop-in SPA router
swap**: porting the editor lifecycle, global state and include scripts is still
required. Guards for unsaved changes are not implemented in this package. Do not
claim a guarded migration until link clicks, programmatic navigation and browser
Back/Forward are all covered. Server deep-link routing must continue to serve the
application shell for `/e/...`; API endpoints remain server-side. This PR only
provides the Router changes and integration examples, not modifications to MICX.

## Event-driven use

The routing object is universal: it knows routes, components, URLs and navigation,
not MICX tenants, editor APIs or specific domain events. Example 07 is just one
consumer. Example 08 demonstrates explicit event wiring using standard
EventTarget APIs and subscription cleanup.

Use `navigate` / `navigateOutlet` when an event should change addressable state;
use a UI handler when it should only show local transient UI. Listen to
`routechange` for the committed navigation, not as a navigation guard.

An event decorator is **not implemented**. If introduced later, it should be a
separate adapter with explicit target, event name, payload-to-route mapping and
connect/disconnect lifecycle. `@route` should continue to describe route metadata;
it should not silently subscribe to global events. Native handlers already expose
all these decisions without adding another Router configuration API.
