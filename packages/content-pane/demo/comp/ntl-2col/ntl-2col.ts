import { html, LitElement, PropertyValues, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import style from './ntl-2col.scss?inline';

@customElement('ntl-2col')
export class Ntl2Col extends LitElement {
  static override styles = [unsafeCSS(style)];

  @property({ type: String, reflect: true })
  accessor topSel = 'h2';

  @property({ type: String, reflect: true })
  accessor breakAt = 'md';

  @property({ type: Number, reflect: true })
  accessor cols = 6;

  public beforeLayoutCallback(element: HTMLElement, replacementElement: HTMLElement, children: HTMLElement[]) {
    Array.from(element.querySelectorAll(':scope > h2')).forEach((child) => {
      child.setAttribute('slot', 'top');
    });
  }

  override connectedCallback() {
    super.connectedCallback();

    window.addEventListener('breakpoint-changed', () => this.requestUpdate());
  }

  protected override firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    this.shadowRoot?.querySelectorAll('slot').forEach((slot) => {
      if (slot.assignedElements().length === 0) {
        slot.classList.add('is-empty');
      } else {
        slot.classList.remove('is-empty');
      }
    });
  }

  protected override render(): unknown {
    const isBigger = true; //isBiggerThanBreakpoint(this.breakAt);

    return html`
      <section part="section" style="--cols: ${this.cols};">
        <div part="top">
          <slot name="top"></slot>
        </div>
        <div id="row" class="${isBigger ? 'row' : 'col'}">
          <div part="main">
            <slot></slot>
          </div>
          <div part="aside">
            <slot name="aside"></slot>
          </div>
        </div>
        <div part="bottom">
          <slot name="bottom"></slot>
        </div>
      </section>
    `;
  }
}
