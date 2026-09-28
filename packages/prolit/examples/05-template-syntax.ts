import { scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit';
import { customElement } from 'lit/decorators.js';

@customElement('example-template-syntax')
export class ExampleTemplateSyntax extends ProlitElement {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
      <section title="About {{ title }}">
        <h2>{{ title }}</h2>
        <input aria-label="Filter" .value="query" @input="query = $event.currentTarget.value">
        <button @click="$fn.toggle()" ~class="{ active: visible }">Toggle details</button>
        <button @click="$fn.markFirst()" ?disabled="!visible">Mark first</button>

        <div *if="visible" *catch="">
          <p *do="const total = items.length" ~style="{ color: accent }">Items: {{ total }}</p>
          <ul>
            <li *for="item of items; item.id" ~class="{ active: item.active }">
              {{$index}}: {{ item.label }}
            </li>
          </ul>
          <dl><div *for="key in counts"><dt>{{ key }}</dt><dd>{{ counts[key] }}</dd></div></dl>
          <small *log="items.length">The count is also logged for debugging.</small>
        </div>
      </section>
    `,

    title: 'Template options',
    query: '',
    visible: true,
    accent: 'teal',
    items: [{ id: 1, label: 'First', active: false }, { id: 2, label: 'Second', active: true }],
    counts: { open: 2, closed: 0 },
    $fn: {
      toggle: (): void => { this.scope.visible = !this.scope.visible; },
      markFirst: (): void => {
        // Deep mutations are not observed; call $update or replace the root array.
        this.scope.items[0].active = true;
        this.scope.$update();
      },
    },
  });
}
