---
name: prolit-scopes
description: Build or modify Prolit scopes, templates and asynchronous UI using @trunkjs/prolit.
---

# Prolit scopes

- Define a separate `scopeDefine` result per component/view; arrange data, `$fn`, `$hooks`, then `$tpl`.
- Mount at a Lit child expression with `prolit(scope, fallback?)`. A scope has one active mount. `scope.$tpl.render()` alone has no mount lifecycle or automatic updates.
- Use direct root assignments; deep mutations need a replacement root or `$update()`. Scope updates do not request outer Lit host updates.
- Start `scopeResource.reload(...args)` explicitly, often in synchronous `$hooks.$connect`. Resources receive `{ signal }` before request arguments; use `retainData: false` for changing search/selection parameters.
- Use callable `scopeAction` under `$fn` for async actions. Check `ScopeResult.status === 'success'` before follow-up work. Actions lock immediately and retain real write outcomes across disconnect. Never infer server rollback from navigation.
- `$connect` can return synchronous cleanup, not a Promise. Manual Lit roots require `setConnected(false)` before disposal and `true` for reconnect.
- Invalid scopes use fallback; valid broken scopes show a technical error. Display resource/action `error.message`; keep raw `cause` in diagnostics. Return the Promise from event callbacks; `$event` is available synchronously.
- Keep the inferred scope for typed field/callback access; opaque `ProlitScope` is for handoff. HTML-string expressions are not TypeScript checked.
- Templates are trusted executable code. Put service values in scope data, never splice them into `prolit_html` source. Runtime compilation requires dynamic code evaluation.
- Do not import Nextrap into the core or its public types. Existing HTML components and the optional dual-root mixin belong to `@trunkjs/prolit-elements`.
