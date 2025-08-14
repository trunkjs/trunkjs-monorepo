import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { prolit_html } from '../src/lib/ProLitTemplate';
import { scopeDefine } from '../src/lib/scopeDefine';

const shadowScope = scopeDefine({
  name: 'TestComponent',
  data: {
    items: ['a', 'b', 'c'],
    data: 'wurst',
  },
  // @language=HTML
  $tpl: prolit_html`
  <tj-responsive debug>
    <div>
     
      <h1 style="color: green" xl-style="color: red">Test Component</h1>
      <div><button *if="data ==='wurst'" @click="data.items.push('b'); $update()">Add</button></div>
      <div *for="e of data.items">{{ e }}<div @click="data.items.length = 0; $update();" .innerHTML="e" style="color: blue" xl-style="color:red">Wurst</div></div>
    </div>
  </tj-responsive>
  `,
});

@customElement('test-component1')
export class TestComponent extends LitElement {
  constructor() {
    super();
    shadowScope.$this = this; // Bind the scope to this instance
  }

  public render() {
    return shadowScope.$tpl.render(); // Render returns a template literal for fast rendering
  }
}
