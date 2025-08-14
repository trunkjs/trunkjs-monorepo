# @trunkjs/prolit

Prolit lets you write concise, HTML-like templates that compile to efficient lit-html templates. Focus on templates; Prolit handles the wiring.

- [Installation](./.README/100-installation.md)
- [Quickstart](./.README/110-quickstart.md)
- [Writing templates](./.README/200-writing-templates.md)
- [Attribute directives](./.README/210-attribute-directives.md)
- [API Reference](./.README/300-api.md)
- [Troubleshooting](./.README/400-troubleshooting.md)

## Why Prolit?

- Author HTML-like templates with simple control flow.
- Use attribute directives for loops and conditionals.
- Interpolate with `{{ expr }}` in text and attributes.
- Works with LitElement and lit-html 3.x.

## Quick example

```ts
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { scopeDefine } from '@trunkjs/prolit';
import { prolit_html } from '@trunkjs/prolit';

const scope = scopeDefine({
  title: 'Todos',
  todos: ['Learn', 'Build'],
  $tpl: prolit_html`
    <h1>{{ title }}</h1>
    <button @click="todos.push('Ship'); $update()">Add</button>
    <ul>
      <li *for="t of todos">{{ t }}</li>
    </ul>
    <p *if="todos.length === 0">Nothing to do</p>
  `,
});

@customElement('todo-list')
export class TodoList extends LitElement {
  constructor() { super(); scope.$this = this; }
  render() { return scope.$tpl.render(); }
}
```

## Attribute directives overview

| Directive | Syntax | Example | Notes |
|---|---|---|---|
| Conditional | `*if="expr"` | `<p *if="flag">Visible</p>` | Renders when truthy; compiled to `when()`. No explicit `else` branch (renders empty). |
| Loop | `*for="item of items"` | `<li *for="t of todos">{{ t }}</li>` | Only `of` is supported. Provides `(item, index)` where `index` is available in expressions. |
| Event listener | `@event="statement(s)"` | `<button @click="count++; $update()">+</button>` | Inline handler runs in template scope; call `$update()` to re-render. |
| Property binding | `.prop="expr"` | `<input .value="name">` | Binds element property. |
| Boolean attribute | `?attr="expr"` | `<button ?disabled="isBusy">Save</button>` | Toggles presence based on boolean. |
| Interpolation | `{{ expr }}` | `<span>Hello {{ user.name }}</span>` | Works in text and quoted attribute values. |
| Reference (experimental) | `$ref="code"` | `<div $ref="elRef = $el"></div>` | Parser emits `ref`, but current runtime env does not export it. See caveats. |

See the full guide in [Attribute directives](./.README/210-attribute-directives.md).

## Links to detailed docs

- [Installation](./.README/100-installation.md)
- [Quickstart](./.README/110-quickstart.md)
- [Writing templates](./.README/200-writing-templates.md)
- [Attribute directives](./.README/210-attribute-directives.md)
- [API Reference](./.README/300-api.md)
- [Troubleshooting](./.README/400-troubleshooting.md)