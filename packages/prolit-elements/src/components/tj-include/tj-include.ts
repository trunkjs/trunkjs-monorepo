import { LoggingMixin } from '@trunkjs/browser-utils';
import { ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('tj-include')
export class TjInclude extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: false, attribute: 'src' })
  public src = '';

  /** Load only when the include becomes visible. */
  @property({ type: Boolean, reflect: true })
  public lazy = false;

  /** Replace the tj-include host with the fetched nodes after a successful load. */
  @property({ type: Boolean, reflect: true })
  public unwrap = false;

  /** Reflected loading state for CSS and integrations. */
  @property({ type: Boolean, reflect: true })
  public loading = false;

  private _observer: IntersectionObserver | null = null;
  private _loadedSrc = '';
  private _loadPromise: Promise<void> | null = null;
  private _defaultLoader: HTMLElement | null = null;

  override createRenderRoot() {
    return this;
  }

  override disconnectedCallback(): void {
    this._observer?.disconnect();
    this._observer = null;
    super.disconnectedCallback();
  }

  private _scheduleLoad() {
    if (!this.src || this._loadedSrc === this.src || this._loadPromise) return;

    if (!this.lazy || typeof IntersectionObserver === 'undefined') {
      void this._loadSrc();
      return;
    }

    this._observer?.disconnect();
    this._observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      this._observer?.disconnect();
      this._observer = null;
      void this._loadSrc();
    });
    this._observer.observe(this);
  }

  private _showLoader() {
    const customLoader = this.querySelector<HTMLElement>(':scope > [slot="loader"]');
    if (customLoader) {
      customLoader.hidden = false;
      return;
    }

    const loader = document.createElement('span');
    loader.setAttribute('data-tj-include-loader', '');
    const configuredText = getComputedStyle(this).getPropertyValue('--tj-include-loader-text').trim();
    loader.textContent = configuredText.replace(/^['"]|['"]$/g, '') || 'Loading…';
    this._defaultLoader = loader;
    this.append(loader);
  }

  private _hideLoader() {
    this._defaultLoader?.remove();
    this._defaultLoader = null;
    const customLoader = this.querySelector<HTMLElement>(':scope > [slot="loader"]');
    if (customLoader) customLoader.hidden = true;
  }

  private async _loadSrc() {
    if (!this.src) {
      this.warn('src attribute is empty. Please provide a valid URL.');
      return;
    }
    if (this._loadedSrc === this.src || this._loadPromise) return this._loadPromise;

    const src = this.src;
    this.loading = true;
    this._showLoader();
    this.dispatchEvent(new CustomEvent('loadstart', { detail: { src }, bubbles: true, composed: true }));

    this._loadPromise = (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`Failed to load content from ${src}: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        const template = document.createElement('template');
        template.innerHTML = text;
        this._loadedSrc = src;

        if (this.unwrap) {
          const fragment = template.content;
          this.dispatchEvent(new CustomEvent('load', { detail: { src }, bubbles: true, composed: true }));
          this.replaceWith(fragment);
          return;
        }

        this.replaceChildren(template.content);
        this.dispatchEvent(new CustomEvent('load', { detail: { src }, bubbles: true, composed: true }));
      } catch (error) {
        this.dispatchEvent(new CustomEvent('error', { detail: { src, error }, bubbles: true, composed: true }));
        this.throwError(`Error fetching content from ${src}: ${error}`);
      } finally {
        this.loading = false;
        if (this.isConnected) this._hideLoader();
        this._loadPromise = null;
      }
    })();

    return this._loadPromise;
  }

  override update(changedProperties: Map<string, unknown>): void {
    super.update(changedProperties);
    if (changedProperties.has('src') || changedProperties.has('lazy')) {
      if (changedProperties.has('src')) {
        this._observer?.disconnect();
        this._observer = null;
      }
      this._scheduleLoad();
    }
  }
}
