# Attribute directives

Prolit templates are plain HTML with a small set of attribute directives and interpolation. This page documents each directive, how it compiles, and caveats.

General rules
- Expressions run inside with($scope) — refer to scope members directly (title, todos), not this.title.
- Interpolation inside attributes works when the attribute value is quoted.
- Structural directives (*if, *for) wrap the element’s output; prefer one structural directive per element for clarity.

Contents
- *if
- *for
- @event
- .prop
- ?attr
- {{ expression }} interpolation
- $ref (experimental)

## *if

Syntax
```html
<div *if="condition">...</div>
```

Behavior
- Renders the element only when the expression is truthy.
- Compiles to lit’s when(condition, () => html`...`, () => html``) with an empty else branch.

Example
```html
<p *if="user">Welcome, {{ user.name }}</p>
```

Notes
- No built-in else. Use a second element with the inverse condition if needed.
- Keep side effects out of conditions; prefer pure expressions.

## *for

Syntax
```html
<li *for="item of items">...</li>
```

Behavior
- Iterates arrays via Array.prototype.map, wrapping the element body.
- The index identifier is available inside the loop body.

Examples
```html
<ul>
  <li *for="t of todos">#{{ index }} {{ t }}</li>
</ul>
```

Limitations
- Only the of form is supported. The in form is not supported and will throw.
- No built-in keying (e.g., repeat/trackBy). If you need stable identity, include stable content/attributes yourself or manage keyed rendering at a higher level.

Tips
- Avoid performing mutations inside the loop body; keep it declarative.

## @event

Syntax
```html
<button @click="statements">...</button>
```

Behavior
- Attaches an event listener whose inline handler executes in the template scope.
- Call $update() within handlers to request a re-render when using LitElement with scope.$this set.

Example
```html
<button @click="count++; $update()">Clicked {{ count }} times</button>
```

Notes
- The native event object is not passed into inline handlers (no $event). If you need event data, consider binding through properties or refactoring to component methods that receive events via standard Lit patterns.

## .prop

Syntax
```html
<input .value="expr">
```

Behavior
- Binds a DOM property to the expression (one-way).

Examples
```html
<input .value="query">
<div .innerHTML="htmlString"></div>
```

Notes
- Prefer .prop for non-string values and for properties that should not serialize to attributes.

## ?attr

Syntax
```html
<button ?disabled="expr">...</button>
```

Behavior
- Toggles the presence of a boolean attribute based on the expression’s truthiness.

Example
```html
<button ?disabled="isBusy">Save</button>
```

Notes
- Use for boolean attributes (disabled, checked, readonly, etc.).

## {{ expression }} interpolation

Text content
```html
<span>Hello {{ user.name }}</span>
```

Quoted attribute values
```html
<img alt="Avatar of {{ user.name }}" src="{{ user.avatarUrl }}">
```

Notes
- Interpolation inside attributes requires the attribute value to be quoted.
- Interpolations are injected as JavaScript expressions into the compiled template literal.

## $ref (experimental)

Syntax
```html
<div $ref="el = $el"></div>
```

Status
- The parser emits a ref binding, but the current runtime environment (litEnv) does not export ref. Using $ref will not work at runtime.

Recommendation
- Avoid $ref for now. Use conventional Lit patterns (querying in the component, ViewChild-like decorators, or event-based element access) until ref is supported.