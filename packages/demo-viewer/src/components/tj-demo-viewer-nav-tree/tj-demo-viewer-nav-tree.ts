import { LitElement, html, nothing, unsafeCSS, type TemplateResult } from 'lit';

import type { TNavTreeNode } from '../../types';
import style from './tj-demo-viewer-nav-tree.scss?inline';

export class TjDemoViewerNavTree extends LitElement {
  static override properties = {
    nodes: { attribute: false },
    activeHref: { attribute: false },
    expandedKeys: { attribute: false },
    forcedExpandedKeys: { attribute: false },
  };

  static override styles = [unsafeCSS(style)];

  declare nodes?: readonly TNavTreeNode[];
  activeHref = '';
  expandedKeys: readonly string[] = [];
  forcedExpandedKeys: readonly string[] = [];

  override render() {
    const nodes = this.nodes ?? [];
    const expandedKeys = new Set(this.expandedKeys);
    const forcedExpandedKeys = new Set(this.forcedExpandedKeys);

    return html`
      <ul class="tree">
        ${nodes.map((node, index) => this.#renderNode(node, `${index}:${node.name}`, expandedKeys, forcedExpandedKeys))}
      </ul>
    `;
  }

  #renderNode(
    node: TNavTreeNode,
    key: string,
    expandedKeys: ReadonlySet<string>,
    forcedExpandedKeys: ReadonlySet<string>,
  ): TemplateResult {
    if ('children' in node) {
      const expanded = expandedKeys.has(key) || forcedExpandedKeys.has(key);
      const children = node.children ?? [];

      return html`
        <li>
          <button
            class="toggle"
            type="button"
            aria-expanded=${String(expanded)}
            @click=${() => this.#toggleExpanded(key)}
          >
            <span class="chevron">${expanded ? '▾' : '▸'}</span>
            <span class="label">${node.name}</span>
          </button>

          ${expanded
            ? html`
                <ul class="branch-children">
                  ${children.map((child, index) =>
                    this.#renderNode(child, `${key}/${index}:${child.name}`, expandedKeys, forcedExpandedKeys),
                  )}
                </ul>
              `
            : nothing}
        </li>
      `;
    }

    const active = this.activeHref === node.href;

    return html`
      <li>
        <a class=${active ? 'link active' : 'link'} href=${node.href}>${node.name}</a>
      </li>
    `;
  }

  #toggleExpanded(key: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-node', {
        detail: { key },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-viewer-nav-tree')) {
  customElements.define('tj-demo-viewer-nav-tree', TjDemoViewerNavTree);
}
