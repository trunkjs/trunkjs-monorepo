# Writing templates

Author templates with HTML + a tiny set of attributes. Expressions run in the template scope via with($scope) – refer to your state directly, not via this.

Basics
- Use prolit_html`...` to author templates; attach them to a scope via scopeDefine.
- Interpolate with {{ expr }} in text and quoted attributes.
- Use directives for control flow: *if and *for.
- Bind events with @event, properties with .prop, and boolean attributes with ?attr.

Text interpolation
```html
<p>Hello {{ user.name }}</p>
```

Attribute interpolation
```html
<img alt="Avatar of {{ user.name }}" src="{{ user.avatarUrl }}">
```

Event listeners
- Inline code executes in the scope.
- Call $update() to request a re-render (when scope.$this is set to your LitElement).
```html
<button @click="count++; $update()">Clicked {{ count }} times</button>
```

Property and boolean bindings
```html
<!-- One-way property binding -->
<input .value="greeting">

<!-- Toggle boolean attributes -->
<button ?disabled="isBusy">Save</button>
```

Control flow

Conditional
```html
<p *if="todos.length === 0">Nothing to do</p>
```

Loop
- Only the of form is supported.
- index is available inside the loop body.
```html
<ul>
  <li *for="t of todos">#{{ index }} {{ t }}</li>
</ul>
```

Combined example
```html
<section>
  <h2>{{ title }}</h2>
  <button @click="todos.push(inputValue); inputValue=''; $update()">Add</button>

  <!-- Display list -->
  <ul>
    <li *for="t of todos">{{ t }}</li>
  </ul>

  <!-- Empty state -->
  <p *if="todos.length === 0">No items yet</p>
</section>
```

Patterns and notes
- State updates
  - Mutate scope values and call $update() inside handlers to re-render.
  - Assigning to non-$ properties on the scope also triggers requestUpdate() when $this is set.
- Expressions and scope
  - Expressions run inside with($scope) – refer to scope values directly (title, todos), not this.title.
- Attributes
  - Interpolation inside attributes works when the original attribute is written quoted. Prefer quoted attributes when using {{ … }}.
- Loops
  - Only of is supported; in is not supported.
  - index is provided by the compiler as the second parameter of map.
- Conditionals
  - No else branch. Use a second element with inverse condition if needed.
- Events
  - Handlers are compiled as functions with no event parameter. Accessing an event object is not supported in inline handlers.
- Experimental: $ref
  - $ref is parsed but the runtime does not provide ref in litEnv; avoid using it for now.