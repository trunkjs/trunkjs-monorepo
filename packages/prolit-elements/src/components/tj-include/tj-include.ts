import { LoggingMixin } from '@trunkjs/browser-utils';
import { ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('tj-include')
export class TjInclude extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: false, attribute: 'src' })
  public src = '';

  constructor() {
    super();
  }

  override createRenderRoot() {
    // We don't want to use a shadow DOM, so we return the host element itself
    return this;
  }

  private async _loadSrc() {
    if (!this.src) {
      this.warn('src attribute is empty. Please provide a valid URL.');
      return;
    }
    try {
      const response = await fetch(this.src);
      if (!response.ok) {
        this.throwError(`Failed to load content from ${this.src}: ${response.status} ${response.statusText}`);
        return;
      }
      const text = await response.text();
      this.innerHTML = text;
    } catch (error) {
      this.throwError(`Error fetching content from ${this.src}: ${error}`);
    }
  }

  override update(changedProperties: Map<string, unknown>): void {
    super.update(changedProperties);
    if (changedProperties.has('src')) {
      this._loadSrc();
    }
  }
}
