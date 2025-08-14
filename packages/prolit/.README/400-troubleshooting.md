# Troubleshooting

“Template is not defined. Please define a template using the $tpl property.”
- Cause: Accessing `scope.$tpl` before assigning a ProLitTemplate.
- Fix: Set `$tpl` via `prolit_html` and/or pass the scope to `ProLitTemplate`.

“Scope is not defined. Please define a scope using scopeDefine.”
- Cause: Calling `tpl.render()` without `tpl.scope` set.
- Fix: Pass the scope in the constructor or set `scope.$tpl = tpl` after `scopeDefine`.

“Unknown attribute ... in element ...”
- Cause: Unsupported directive name (typo or not implemented).
- Fix: Use supported directives (`*if`, `*for`, `*do`, `*log`, `@`, `.`, `?`, `~class`, `~style`).

“Invalid *for attribute value”
- Cause: Pattern must be `x of arr` or `k in obj` optionally followed by `; keyExpr`.
- Fix: Use `of` for arrays, `in` for object keys, e.g. `*for="t of todos; t.id"`.

“Nothing updates after clicking”
- Cause: In-place mutation without triggering re-render.
- Fix: Call `$update()` after mutating arrays/objects (e.g., `arr.push(x); $update()`). Assigning to non-$ scope fields triggers an update automatically when `scope.$this` is set.

“No event object in @event handler”
- Cause: Inline `@event` handlers do not receive an event parameter.
- Fix: Use scope state, or wire events via standard Lit patterns if you need the event.

“$ref not working”
- Cause: `ref` is not exported in the current runtime env.
- Fix: Avoid `$ref` for now; use other patterns for element access.