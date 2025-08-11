import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import style from './ErrorElement.scss?inline';

@customElement('tj-error-element')
export class TjErrorElement extends LitElement {
  // @ts-expect-error We are using unsafeCSS to inline the styles
  static styles = [unsafeCSS(style)];

  private originalCode?: string;

  @property({ type: String, reflect: true })
  private message: string;

  static get is() {
    return 'tj-error-element';
  }

  constructor(message = 'An error occurred', originalCode?: string) {
    super();
    this.message = message;
    this.originalCode = originalCode;
  }

  override render() {
    return html`
      <div id="error-fixed-indicator" @click=${() => this.scrollIntoView({ behavior: 'smooth' })}>
        Err: ${this.message}
      </div>
      <div id="error">
        <h1>Error: ${this.message}</h1>
        <pre class="error-details">
          ${this.originalCode ? this.originalCode : 'No code provided.'}
        </pre
        >

        <slot></slot>
      </div>
    `;
  }
}
