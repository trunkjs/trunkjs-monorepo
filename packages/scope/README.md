# @trunkjs/scope

Shared state and activation runtime, independent of Lit and Prolit.

## Direct state and callbacks

```ts
import { defineReactiveScope } from '@trunkjs/scope';

const scope = defineReactiveScope({
  name: 'Ada',
  $on: { selected: (id: string) => console.log(id) },
});
scope.name = 'Linus';
scope.$emit('selected', '42'); // callback receives "42"
```

Root assignments notify the active consumer once per microtask. Deep mutations need a root replacement or
`scope.$update()`. `$raw` exposes the original definition; `$rawPure` returns fields without a dollar prefix.
Create one scope per independent component. Callbacks are scope-local; `$emit` does not dispatch DOM events.

## Activation and cleanup without a renderer

```ts
import { defineReactiveScope, scopeResource } from '@trunkjs/scope';
import { connect, disconnect, getRuntime } from '@trunkjs/scope/runtime';

const scope = defineReactiveScope({
  users: scopeResource({ load: async () => ['Ada'], errorMessage: 'Cannot load users' }),
});
const consumer = { changed: () => console.log(scope.users.data), diagnose: console.error };
const runtime = getRuntime(scope)!;
connect(runtime, consumer);
await scope.users.reload(); // consumer sees ["Ada"]
disconnect(runtime, consumer);
```

A scope has one active consumer. `$hooks.$connect` runs on each activation and can return synchronous cleanup.
Disconnect cancels pending resource reads; reconnect permits a new read. Actions keep real write results across
disconnect and are not retried automatically. `scopeResource` and `scopeAction` retain their typed pending/error/result API.
Prolit owns this activation automatically when it mounts the scope; applications do not activate it a second time.

## Structured values

The existing `defineScope`, `defineArray`, and `createScope` API remains available:
`createScope({ name: { defaultValue: 'Ada' } }).name.$value`.
It preserves metadata, root references and array containers and uses the same notification runtime.
The optional value factory can supply its own DOM binding; direct reactive scopes require no DOM.
The existing `EventMixin` manages callback registries. DOM listener connection/disconnection belongs to
`EventBindingsMixin` in Browser Utils.

Prolit's `scopeDefine` adds template compilation/binding to this runtime and preserves direct data access.
Scope itself has no knowledge of HTML templates, Lit, custom elements or dialog presentation.
