# @trunkjs/prolit

Prolit lets you write concise, HTML-like templates that compile to efficient lit-html templates.

- [Installation](./.README/100-installation.md)
- [Quickstart](./.README/110-quickstart.md)
- [Writing templates](./.README/200-writing-templates.md)
- [Attribute directives](./.README/210-attribute-directives.md)
- [API Reference](./.README/300-api.md)
- [Troubleshooting](./.README/400-troubleshooting.md)

## Why Prolit?

- HTML-like templates with simple control flow and interpolation.
- Structural directives: `*if`, `*for`, plus helpers `*do`, `*log`.
- Bindings: `@event`, `.prop`, `?attr`, `~class`, `~style`.
- Works with LitElement and lit-html 3.x.

## Quick, all-in-one example

```ts
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { scopeDefine, prolit_html } from '@trunkjs/prolit';

const scope = scopeDefine({
  title: 'Todos',
  input: '',
  debug: true,
  busy: false,
  count: 0,
  todos: [{ id: 1, text: 'Learn' }, { id: 2, text: 'Build' }],
  matrix: [[1, 2], [3, 4]],
  $tpl: prolit_html`
    <h1>{{ title }}</h1>

    <!-- property + boolean + class/style + event -->
    <button
      @click="count++; $update()"
      ?disabled="busy"
      ~class="{ active: count > 0 }"
      ~style="{ color: busy ? 'gray' : 'blue' }"
    >
      Clicked {{ count }}x
    </button>

    <!-- interpolation in attribute (quoted) -->
    <div title="Items: {{ todos.length }}"></div>

    <!-- multiple structural directives on one element (left-to-right) -->
    <!-- order: *if then *for -> if gates the loop -->
    <ul>
      <li *if="todos.length" *for="t of todos; t.id">
        {{$index}}: {{ t.text }}
      </li>
    </ul>

    <!-- order: *for then *if -> loop first, filter per item -->
    <ul>
      <li *for="t of todos" *if="t.text.startsWith('B')">
        {{ t.text }}
      </li>
    </ul>

    <!-- nested loops by repeating *for -->
    <ul>
      <li *for="row of matrix" *for="cell of row">{{ $index }}:{{ cell }}</li>
    </ul>

    <!-- object iteration with 'in' and $index -->
    <ul>
      <li *for="k in obj">{{ $index }}:{{ k }}={{ obj[k] }}</li>
    </ul>

    <!-- *do and *log -->
    <p *do="greet = 'Hi'">{{ greet }}, user!</p>
    <span *if="debug" *log="todos.length"></span>
  `,
  // additional data used above
  obj: { a: 1, b: 2 },
});

@customElement('todo-list')
export class TodoList extends LitElement {
  constructor() { super(); scope.$this = this; }
  override render() { return scope.$tpl.render(); }
}
```

Key capabilities
- Use multiple structural directives on the same element; they apply left-to-right (attribute order).
- `*for` supports `of` (arrays) and `in` (object keys), exposes `$index`, and optional keying via `; expr` (e.g. `t.id`).
- Inline handlers run in scope; for in-place mutations, call `$update()`. Assigning to non-$ scope fields triggers an update automatically when `scope.$this` is set.