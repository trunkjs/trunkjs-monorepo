# Writing templates

Author templates with HTML + a small set of directives. Expressions run in the template scope via `with($scope)` – refer to your state directly (e.g. `title`, `todos`), not `this.title`.

Basics
- Use `prolit_html`...` to author templates and attach them with `scopeDefine`.
- Interpolate with `{{ expr }}` in text and quoted attribute values.
- Control flow: `*if`, `*for`, helpers `*do`, `*log`.
- Bindings: `@event`, `.prop`, `?attr`, `~class`, `~style`.

Text interpolation
```html
<p>Hello {{ user.name }}</p>
```

Attribute interpolation (quoted)
```html
<img alt="Avatar of {{ user.name }}" src="{{ user.avatarUrl }}">
```

Events and updates
- Inline `@event` handlers execute in scope.
- For in-place mutations (e.g., `arr.push()`), call `$update()` to trigger a re-render.
- Assigning to non-$ properties triggers `requestUpdate()` automatically when `scope.$this` is set (e.g., `count++`).

```html
<button @click="count++; $update()">Clicked {{ count }} times</button>
```

Property and boolean bindings
```html
<input .value="greeting">
<button ?disabled="isBusy">Save</button>
```

Class and style maps
```html
<span ~class="{ active: on, disabled: !on }" ~style="{ color: on ? 'green' : 'gray' }">OK</span>
```

Control flow

Conditional
```html
<p *if="todos.length === 0">Nothing to do</p>
```

Loop
- `*for` supports arrays via `of` and object keys via `in`.
- `$index` is available inside the loop body.
- Optional keying after `;` helps stability: `*for="t of todos; t.id"`.

```html
<ul>
  <li *for="t of todos; t.id">{{$index}}-{{ t.text }}</li>
</ul>

<ul>
  <li *for="k in dict">{{$index}}:{{ k }}={{ dict[k] }}</li>
</ul>
```

Multiple structural directives on one element
- You can stack `*if`, `*for`, `*do`, `*log` on the same element.
- Applied left-to-right (attribute order); the first structural attribute becomes the outermost wrapper.

```html
<!-- if then for: gate the whole loop -->
<li *if="show" *for="t of todos">{{ t }}</li>

<!-- for then if: loop first, filter per iteration -->
<li *for="t of todos" *if="t.visible">{{ t.text }}</li>

<!-- nested loops by repeating *for -->
<li *for="row of matrix" *for="cell of row">{{ $index }}:{{ cell }}</li>
```

Helpers

`*do` – run code before rendering inner content
```html
<p *do="greeting = 'Hello'">{{ greeting }}, {{ name }}!</p>
```

`*log` – log expression result then render
```html
<span *log="value">{{ value }}</span>
```

Variable scope semantics
- `let`/`const` inside `@event` or `*do` create locals, not scope fields.
- Bare assignment (e.g., `count = 1`, `clicks++`) writes to the scope.
- `*for` loop variables are local to the loop; they are not available outside.