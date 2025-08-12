import { create_element, LoggingMixin } from '@trunkjs/browser-utils';
import { Template } from '@trunkjs/template';
import { scopeDefine, ScopeDefinition } from '@trunkjs/template/src/lib/scopeDefine';
import { ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const templateRenderInElement: WeakMap<HTMLTemplateElement, HTMLElement> = new WeakMap();
const templateClass: WeakMap<HTMLTemplateElement, Template> = new WeakMap();

@customElement('tj-html-scope')
export class TjHtmlScope extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn = 'change';

  public $scope: ScopeDefinition;

  constructor() {
    super();
    this.$scope = scopeDefine({});
  }

  override createRenderRoot() {
    // We don't want to use a shadow DOM, so we return the host element itself
    return this;
  }

  private _renderTemplates() {
    for (const template of Array.from(this.querySelectorAll('template'))) {
      if (!templateRenderInElement.has(template)) {
        // Create a new Element below template
        const rendersInElment = create_element('div', { style: 'display: contents' });
        templateRenderInElement.set(template, rendersInElment);
        template.parentElement?.insertBefore(rendersInElment, template.nextSibling);
        templateClass.set(template, new Template(template.innerHTML, this.$scope));
      }

      // Render the template in the element
      templateClass.get(template)?.renderInElement(templateRenderInElement.get(template) as HTMLElement);
    }
  }

  private _updateScope() {
    for (const input of Array.from(this.querySelectorAll('[name]') as unknown as HTMLInputElement[])) {
      const name = input.getAttribute('name');
      if (name && input.value !== undefined) {
        this.$scope[name] = input.value;
      }
    }
  }

  override updated() {
    this.log('Updated', this.$scope);
    const listener = () => {
      this._updateScope();
      this._renderTemplates();
    };

    for (const key of this.updateOn.replace(',', ' ').split(' ')) {
      if (key.trim() === '') continue;
      this.removeEventListener(key, listener);
      this.addEventListener(key, listener);
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.log('Connected', this.$scope);
    this._updateScope();
    this._renderTemplates();
  }
}

declare global {
  interface TjHtmlScope {
    updateOn: string; // Comma-separated list of events to trigger updates
    debug?: boolean;
    $scope: ScopeDefinition;
  }
  interface HTMLElementTagNameMap {
    'tj-html-scope': TjHtmlScope;
  }

  interface Window {
    TjHtmlScope: typeof TjHtmlScope;
  }

  interface HTMLElementEventMap {
    'scope-update': CustomEvent<void>;
  }

  interface ElementEventMap {
    'scope-update': CustomEvent<void>;
  }
}
