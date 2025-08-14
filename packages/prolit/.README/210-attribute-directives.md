# Attribute directives

Prolit adds a small set of attribute directives and interpolation to plain HTML. Expressions run under `with($scope)` – refer to scope members directly.

Contents
- Structural: `*if`, `*for`, `*do`, `*log`
- Bindings: `@event`, `.prop`, `?attr`, `~class`, `~style`
- Interpolation: `{{ expr }}`
- Experimental: `$ref`

General rules
- Structural directives can be combined on the same element; they apply left-to-right (attribute order). The first structural attribute is the outermost wrapper.
- Interpolation inside attributes works when the value is quoted.
- `$index` is available inside `*for` bodies.

Multiple structural directives (order matters)
```html
<!-- if then for -->
<li *if="show" *for="t of todos">{{ t }}</li>

<!-- for then if -->
<li *for="t of todos" *if="t.visible">{{ t.text }}</li>

<!-- multiple *for create nested loops -->
<li *for="row of matrix" *for="cell of row">{{ $index }}:{{ cell }}</li>
```

## *if

Syntax
```html
<div *if="condition">...</div>
```

Behavior
- Renders when truthy; compiled to `when(condition, () => html`...`, () => html``)`.

## *for

Syntax (arrays and objects)
```html
<li *for="item of items">...</li>
<li *for="key in obj">...</li>
```

Features
- `$index` available in the loop body.
- Keying via semicolon for stable identity:
  ```html
  <li *for="t of todos; t.id">{{ t.id }} {{ t.text }}</li>
  ```

Examples
```html
<ul><li *for="t of todos">{{$index}}:{{ t }}</li></ul>
<ul><li *for="k in obj">{{$index}}:{{ k }}={{ obj[k] }}</li></ul>
```

## *do

Syntax
```html
<div *do="statements">...</div>
```

Behavior
- Executes code in scope context before rendering the element’s content. Useful for local prep.

Example
```html
<span *do="v = obj[k]">{{ v }}</span>
```

## *log

Syntax
```html
<div *log="expr">...</div>
```

Behavior
- Logs the evaluated expression, then renders the content.

## @event

Syntax
```html
<button @click="statements">...</button>
```

Behavior
- Inline handler executes in scope. No event object is passed.
- For in-place mutations, call `$update()` to re-render.

## .prop

Syntax
```html
<input .value="expr">
```

Behavior
- One-way property binding (not attributes).

## ?attr

Syntax
```html
<button ?disabled="expr">...</button>
```

Behavior
- Toggles boolean attributes based on truthiness.

## ~class and ~style

Syntax
```html
<span ~class="{ active: isOn }" ~style="{ color: isOn ? 'green' : 'gray' }"></span>
```

Behavior
- `~class` maps to `classMap`, `~style` maps to `styleMap`.

## {{ expression }} interpolation

Text
```html
<span>Hello {{ user.name }}</span>
```

Attributes (quoted)
```html
<img alt="Avatar of {{ user.name }}">
```

## $ref (experimental)

- Parser can emit a `ref` binding, but the current runtime (`litEnv`) does not export `ref`. Avoid `$ref` for now.