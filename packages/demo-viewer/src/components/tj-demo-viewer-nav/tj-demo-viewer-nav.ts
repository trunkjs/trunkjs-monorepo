import { LitElement, html, nothing, unsafeCSS } from 'lit';

import type { TNavData, TNavTreeNode } from '../../types';
import '../tj-demo-viewer-nav-tree/tj-demo-viewer-nav-tree';
import style from './tj-demo-viewer-nav.scss?inline';

const EXPANDED_STORAGE_KEY = 'tj-demo-viewer-nav:expanded';
const OPEN_STORAGE_KEY = 'tj-demo-viewer-nav:open';

export class TjDemoViewerNav extends LitElement {
  static override properties = {
    data: { attribute: false },
    activeHref: { state: true },
    navOpen: { state: true },
  };

  static override styles = [unsafeCSS(style)];

  declare data?: TNavData;
  activeHref = '';
  navOpen = true;

  #expandedKeys = new Set<string>();
  #resizeObserver?: ResizeObserver;

  constructor() {
    super();
    this.#expandedKeys = this.#readExpandedKeys();
    this.activeHref = this.#getCurrentHref();
    this.navOpen = this.#readOpenState();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.activeHref = this.#getCurrentHref();
    this.#startResizeObserver();
    this.#applyDocumentPadding();
    window.addEventListener('hashchange', this.#onHashChange);
  }

  override disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    this.#clearDocumentPadding();
    window.removeEventListener('hashchange', this.#onHashChange);
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (changedProperties.has('navOpen')) {
      this.#writeOpenState();
      this.#applyDocumentPadding();
    }
  }

  override render() {
    if (!this.data) {
      return html`No Data`;
    }

    const forcedExpandedKeys = this.#findAncestorKeys(this.data.tree, this.activeHref);

    return html`
      <div class=${this.navOpen ? 'shell is-open' : 'shell is-closed'}>
        <div class="rail">
          <button
            class="nav-toggle"
            type="button"
            aria-label=${this.navOpen ? 'Navigation einklappen' : 'Navigation ausklappen'}
            aria-expanded=${String(this.navOpen)}
            @click=${this.#toggleNav}
          >
            <span class="nav-toggle-icon" aria-hidden="true">${this.navOpen ? '◂' : '▸'}</span>
          </button>

          <div class="rail-content">
            <span class="nav-toggle-label">DemoViewer</span>
          </div>
        </div>

        <div class="sidebar-wrapper">
          <div class="panel" ?hidden=${!this.navOpen}>
            <nav aria-label=${this.data.title}>
              <header>
                <h2>${this.data.title}</h2>
                ${this.data.description ? html`<p>${this.data.description}</p>` : nothing}
              </header>

              <tj-demo-viewer-nav-tree
                .nodes=${this.data.tree}
                .activeHref=${this.activeHref}
                .expandedKeys=${[...this.#expandedKeys]}
                .forcedExpandedKeys=${forcedExpandedKeys}
                @toggle-node=${this.#onToggleNode}
              ></tj-demo-viewer-nav-tree>
            </nav>
          </div>
        </div>
      </div>
    `;
  }

  #toggleExpanded(key: string) {
    if (this.#expandedKeys.has(key)) {
      this.#expandedKeys.delete(key);
    } else {
      this.#expandedKeys.add(key);
    }

    this.#writeExpandedKeys();
    this.requestUpdate();
  }

  #toggleNav = () => {
    this.navOpen = !this.navOpen;
  };

  #onToggleNode = (event: CustomEvent<{ key: string }>) => {
    this.#toggleExpanded(event.detail.key);
  };

  #findAncestorKeys(nodes: readonly TNavTreeNode[], href: string, parentKey = ''): string[] {
    return this.#findAncestorKeysRecursive(nodes, href, parentKey) ?? [];
  }

  #findAncestorKeysRecursive(nodes: readonly TNavTreeNode[], href: string, parentKey = ''): string[] | null {
    for (const [index, node] of nodes.entries()) {
      const key = parentKey ? `${parentKey}/${index}:${node.name}` : `${index}:${node.name}`;

      if ('children' in node) {
        const childKeys = this.#findAncestorKeysRecursive(node.children ?? [], href, key);
        if (childKeys) {
          return [key, ...childKeys];
        }
      } else if (node.href === href) {
        return [];
      }
    }

    return null;
  }

  #readExpandedKeys(): Set<string> {
    if (typeof sessionStorage === 'undefined') {
      return new Set();
    }

    try {
      const raw = sessionStorage.getItem(EXPANDED_STORAGE_KEY);
      if (!raw) {
        return new Set();
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return new Set();
      }

      return new Set(parsed.filter((value) => typeof value === 'string'));
    } catch {
      return new Set();
    }
  }

  #writeExpandedKeys() {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...this.#expandedKeys]));
    } catch {
      /* ignore storage errors */
    }
  }

  #readOpenState() {
    if (typeof sessionStorage === 'undefined') {
      return true;
    }

    try {
      const raw = sessionStorage.getItem(OPEN_STORAGE_KEY);
      if (raw === null) {
        return true;
      }

      return raw === 'true';
    } catch {
      return true;
    }
  }

  #writeOpenState() {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(OPEN_STORAGE_KEY, String(this.navOpen));
    } catch {
      /* ignore storage errors */
    }
  }

  #applyDocumentPadding() {
    if (typeof document === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      document.documentElement.style.paddingLeft = `${this.getBoundingClientRect().width}px`;
    });
  }

  #clearDocumentPadding() {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.style.paddingLeft = '';
  }

  #startResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#applyDocumentPadding();
    });
    this.#resizeObserver.observe(this);
  }

  #getCurrentHref() {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.location.hash;
  }

  #onHashChange = () => {
    this.activeHref = this.#getCurrentHref();
  };
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-viewer-nav')) {
  customElements.define('tj-demo-viewer-nav', TjDemoViewerNav);
}
