import type { DemoType } from '@shared/types';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { html } from 'lit/static-html.js';

@customElement('demo-component1')
class DemoComponent1 extends LitElement {
  render() {
    const wrust: DemoType = {
      description: 'wurt',
      name: 'wurst',
    };
    return html`<div>
      <h1>Demo Component 1</h1>
      <p>This is a demo compnt.</p>
      <slot></slot>
    </div>`;
  }
}
