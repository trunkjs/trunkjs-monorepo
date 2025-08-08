import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { scopeDefine } from '../src/lib/scopeDefine';
import { template } from '../src/lib/template';

const shadowScope = scopeDefine({
  name: 'TestComponent',
  data: {
    items: ['a', 'b', 'c'],
    data: 'wurst',
  },
  // @language=HTML
  $tpl: template`
  <div>
    <h1>Test Component</h1>
    <div *for="e of data.items">abc</div>
  </div>
  `,
});

@customElement('test-component1')
export class TestComponent extends LitElement {
  public render() {
    return shadowScope.$tpl.render(); // Render returns a template literal for fast rendering
  }
}
