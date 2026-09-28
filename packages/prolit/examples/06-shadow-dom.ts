import { scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit';
import { unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import widgetCss from './06-shadow-dom.css?inline';

@customElement('example-embedded-counter')
export class ExampleEmbeddedCounter extends ProlitElement {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
      <section>
        <h2><slot name="heading">Embedded counter</slot></h2>
        <button @click="count++">Clicks: {{ count }}</button>
        <p>Events in the shadow root: {{ events }}</p>
      </section>
    `,

    count: 0,
    events: 0,
  });

  // Exception: this widget is intended for embedding in other applications.
  static override useShadowDom = true;
  static override styles = unsafeCSS(widgetCss);

  constructor() {
    super();
    this.on('click', () => { this.scope.events++; }, { target: 'shadowRoot' });
  }
}
