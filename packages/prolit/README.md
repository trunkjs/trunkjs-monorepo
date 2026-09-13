# @trunkjs/prolit

HTML-like templates on Lit, with instance-local state and typed callbacks. The implemented API is `scopeDefine`, `prolit`, `scopeResource`, `scopeAction`, `isProlitScope` and the types `ProlitScope`, `ProlitAware`, `ScopeResult`, `ScopeError`, `ScopeResource`, `ScopeAction` and `ScopeDiagnostic`.

## 01 Define state, then mount its template

```ts
import { render } from 'lit';
import { prolit, prolit_html, scopeDefine } from '@trunkjs/prolit';

const target = document.createElement('section');
document.body.append(target);
const scope = scopeDefine({
  name: 'Ada',
  $fn: {
    rename: (): void => { scope.name = 'Ada Lovelace'; },
  },
  $tpl: prolit_html`
    <p>Hello {{ name }}</p>
    <button @click="$fn.rename()">Rename</button>
  `,
});
const part = render(prolit(scope), target);

// Call when this manually owned view is removed.
function dispose(): void {
  part.setConnected(false);
  target.remove();
}
```

The button changes the displayed name without a host reference or a manual render call. A scope has one active mount; create a new scope per instance. A disconnected scope can be mounted again with its local values intact. For the same manual root, reinsert its target and call `part.setConnected(true)` to reconnect. `LitElement` manages the connection of its own root automatically.

Direct assignments are reactive and batched in a microtask. Nested mutations need a new root value (`scope.items = [...scope.items, item]`) or an explicit `scope.$update()`. Rendering a template directly with `scope.$tpl.render()` returns a Lit `TemplateResult`, but supplies no connection, cleanup or automatic part updates. Legacy `$this.requestUpdate()` forwarding remains available for that older usage.

## 02 Read explicitly, keep action state with its callback

This independent example uses local async stand-ins; replace only `load` and `run` with application services.

```ts
import { render } from 'lit';
import { prolit, prolit_html, scopeDefine, scopeResource, scopeAction } from '@trunkjs/prolit';

const target = document.createElement('section');
document.body.append(target);
const scope = scopeDefine({
  users: scopeResource({
    load: async () => [{ id: '42', name: 'Ada' }],
    errorMessage: 'Users could not be loaded.',
  }),
  $fn: {
    save: scopeAction({
      run: async (id: string) => ({ savedId: id }),
      errorMessage: 'Changes could not be saved.',
    }),
  },
  $hooks: {
    $connect: (): void => { void scope.users.reload(); },
  },
  $tpl: prolit_html`
    <p *if="users.pending" role="status">Loading…</p>
    <p *if="users.error" role="alert">{{ users.error.message }}</p>
    <button @click="users.reload()" ?disabled="users.pending">Reload</button>
    <p *if="!users.pending && users.data?.length === 0">No users.</p>
    <ul>
      <li *for="user of users.data ?? []; user.id">
        {{ user.name }}
        <button @click="$fn.save(user.id)" ?disabled="$fn.save.pending">Save</button>
      </li>
    </ul>
    <p *if="$fn.save.pending" role="status">Saving…</p>
    <p *if="$fn.save.error" role="alert">{{ $fn.save.error.message }}</p>
  `,
});
const part = render(prolit(scope), target);
function dispose(): void {
  part.setConnected(false);
  target.remove();
}
```

`$connect` runs synchronously after the binding becomes active, once per connection. It may return a synchronous cleanup function, such as an unsubscribe callback. It must not return a Promise. Scope construction and template evaluation do not start requests. Older hook declarations and `$on` do not implement additional lifecycle behavior.

| Operation | Public state | Start and result |
|---|---|---|
| `scopeResource({ load, errorMessage, retainData? })` | readonly `data`, `pending`, `error` | `reload(...args)` passes `{ signal }` before the arguments to `load` |
| `scopeAction({ run, errorMessage })` | callable with readonly `pending`, `error` | call directly, e.g. `$fn.save(id)` |

Both return `Promise<ScopeResult<T>>`: `success` with `data`, `error` with `{ message, cause }`, or `cancelled` with reason `superseded`, `disconnected` or `busy`. Only `success` authorizes success-dependent follow-up work. Empty data is a successful result. `errorMessage` must be a nonempty, public-facing string.

Reads use latest-request-wins: superseding or disconnecting settles the old result as cancelled immediately, signals abort and ignores late completion even if the transport ignores abort. `retainData` defaults to `true`; use `false` when search parameters or selected IDs change. Pass each request's arguments explicitly; assigning an unrelated field starts no read.

Actions lock synchronously; concurrent calls return `cancelled/busy`. A started write keeps its actual pending state and result across disconnect/reconnect. There is no automatic abort, rollback or retry. New operations while disconnected return `cancelled/disconnected` without invoking the service. Before delayed UI work, the application checks its connection and, for reused views, its current session.

## 03 Existing components and fallback

Use `html` from `lit` and the scope from 01. Each line replaces its render call; they are separate placement variants:

```ts
render(html`<existing-panel>${prolit(scope)}</existing-panel>`, target);
render(prolit(undefined, html`<p>Default content</p>`), target);
```

Register `existing-panel` through its owning library. The first variant inserts content into its light DOM. In a component's shadow template, the same expression renders into that shadow root. There is no required `ProlitElement` superclass. The optional `withProlitLightDom` mixin is in `@trunkjs/prolit-elements`.

`ProlitAware` describes an optional `contentScope?: ProlitScope`. A component explicitly declares that as a reactive Lit property and calls `prolit(this.contentScope, defaultContent)` at its content point. The interface alone activates nothing. `isProlitScope` checks runtime identity; ordinary data objects are not scopes. Keep the original inferred scope when accessing its exact `$fn` types; the opaque handoff type intentionally hides application fields.

An invalid or missing scope renders the ordinary Lit fallback (default `nothing`). A valid scope with a template, event or connection error shows an accessible technical error instead. Fallback is a value, not a lazy callback.

## 04 Errors and limits

Subscribe to `scope-error` on the insertion element or an ancestor. The event bubbles across shadow boundaries and carries `ScopeDiagnostic`: original `cause`, `scope`, `phase` and, where available, `expression`. Phases are `render`, `event`, `connect`, `cleanup`, `resource` and `action`. Resource/action failures populate their own state; render the controlled `error.message` yourself. Detached action failures are logged to the console when no mount can receive them.

Event expressions receive `$event` synchronously. Both `$fn.save()` and `$event.preventDefault(); $fn.save()` route a final returned Promise's rejection to the technical error boundary. Read `currentTarget` before awaiting. Detached promises deliberately discarded inside a callback cannot be intercepted: return/await them or handle them there.

Technical render/event errors remain visible until a subsequent scope mutation or `$update()` attempts rendering again. A failed connect is retried only on reconnect or scope replacement. Cleanup still releases ownership when a cleanup callback throws. Duplicate active mounts are diagnosed without disturbing the first mount.

Templates are trusted executable code (`new Function`, `with`, event `eval`); scopes are not a sandbox. Pass untrusted data through scope values, never through `${...}` source interpolation in `prolit_html`. Strict CSP without dynamic evaluation and template-expression type checking require future compiler work. `$fn` TypeScript calls are checked; JavaScript inside HTML strings is not. No router, global cache, field-validation engine, deep reactivity or server-write rollback is implied.

Further syntax: `{{ }}`, `*for`, `*if`, `*do`, `*catch`, `*log`, `@event`, `.property`, `?boolean`, `~class`, `~style`. See [template syntax](.README/200-writing-templates.md) and [attribute directives](.README/210-attribute-directives.md). Those low-level guides predate the lifecycle API above; `$ref` remains unsupported. The [SPA examples](../prolit-elements/proposals/examples/README.md) separate implemented TrunkJS APIs from proposed Nextrap integration.

## Verification

From the monorepo root: `npx nx test prolit` and `npx nx build prolit`. Vitest includes the existing directive tests and checks the public scope types with TypeScript. The implementation tests cover DOM updates, errors, lifecycle and async races.
