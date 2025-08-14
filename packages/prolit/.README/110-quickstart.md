# Quickstart

1) Define a scope with state and a template
```ts
import { scopeDefine, prolit_html } from '@trunkjs/prolit';

export const scope = scopeDefine  title: 'Hello',
  items: ['a', 'b'],
  $tpl: prolit_html`
    <h1>{{ title }}</h1>
    <button @click="items.push('c'); $update()">Add</button>
    <ul><li *for="x of items">{{ x }}</li></ul>
  `,
});
```

2) Bind the scope to a LitElement and render
```ts
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { scope } from './scope';

@customElement('hello-list')
export class HelloList extends LitElement {
  constructor() { super(); scope.$this = this; }
  override render() { return scope.$tpl.render(); }
}
```

3) Use in HTML
```html
<hello-list></hello-list>
```

Non-Lit usage
```ts
import { scopeDefine, ProLitTemplate } from '@trunkjs/prolit';
const scope = scopeDefine({ msg: 'Hi', $tpl: new ProLitTemplate('<p>{{ msg }}</p>') });
scope.$tpl.renderInElement(document.getElementById('app')!);
```