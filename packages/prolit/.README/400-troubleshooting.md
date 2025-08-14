# Troubleshooting

Template is not defined. Please define a template using the $tpl property.
- Cause: Accessing `scope.$tpl` before assigning a ProLitTemplate.
- Fix: Set `$tpl` via `prolit_html` and/or pass the scope to `ProLitTemplate`.

Scope is not defined. Please define a scope using scopeDefine.
- Cause: Calling `tpl.render()` without `tpl.scope` set.
- Fix: Either pass the scope in the constructor or set `scope.$tpl = tpl` after `scopeDefine`.

Unknown attribute ... in element ...
- Cause: Using an unsupported directive name (e.g., `*else`, or typos).
- Fix: Use supported directives (`*if`, `*for`) or remove/replace.

Invalid *for attribute value
- Cause: Only `item of items` is supported.
- Fix: Replace with the `of` form.

Nothing updates after clicking
- Cause: Reactive update not triggered.
- Fix: For inline handlers, mutate scope and call `$update()`. Also ensure `scope.$this = this` in the component constructor.

$ref not working
- Cause: `ref` is not exported in the current runtime env.
- Fix: Avoid `$ref` for now; use standard element refs via event handlers or Lit patterns.