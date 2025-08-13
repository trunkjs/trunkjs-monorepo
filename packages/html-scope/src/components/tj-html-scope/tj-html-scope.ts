import { create_element, Debouncer, LoggingMixin, waitForDomContentLoaded } from '@trunkjs/browser-utils';
import { scopeDefine, ScopeDefinition, Template } from '@trunkjs/template';
import { PropertyValues, ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { evaluateScopeInitExpression } from '../../utils/scope-init';

const templateRenderInElement: WeakMap<HTMLTemplateElement, HTMLElement> = new WeakMap();
const templateClass: WeakMap<HTMLTemplateElement, Template> = new WeakMap();

const scopeInitDebouncer = new Debouncer(50, 200);

@customElement('tj-html-scope')
export class TjHtmlScope extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn = 'change keyup click';

  @property({ type: String, reflect: true, attribute: 'scope-init' })
  public scopeInit?: string;

  public $scope: ScopeDefinition;

  #isFirstRender = true;

  constructor() {
    super();
    this.$scope = scopeDefine({});
  }

  override createRenderRoot() {
    // We don't want to use a shadow DOM, so we return the host element itself
    return this;
  }

  private _renderTemplates() {
    const templates = Array.from(this.querySelectorAll('template')) as HTMLTemplateElement[];
    if (templates.length === 0) {
      this.warn(
        'No templates found in tj-html-scope element. Please add <template> elements inside the tj-html-scope element.',
      );
      return;
    }
    if (templates.length > 1) {
      this.warn('Multiple templates found in tj-html-scope element. Only the first template will be rendered.');
    }
    const template = templates[0];
    if (!templateRenderInElement.has(template)) {
      // Create a new Element below template
      const rendersInElment = create_element('div', { style: 'display: contents' });
      templateRenderInElement.set(template, rendersInElment);
      template.parentElement?.insertBefore(rendersInElment, template.nextSibling);

      templateClass.set(template, new Template(template.innerHTML, this.$scope));
    }

    // Render the template in the element
    templateClass.get(template)?.renderInElement(templateRenderInElement.get(template) as HTMLElement);

    if (this.#isFirstRender) {
      this._updateScope();
      this.#isFirstRender = false;
    }
  }

  private _updateScope() {
    for (const input of Array.from(this.querySelectorAll('[name]') as unknown as HTMLInputElement[])) {
      const name = input.getAttribute('name');
      if (name && input.value !== undefined) {
        this.$scope[name] = input.value;
      }
    }
    this.log('Scope updated', this.$scope.$rawPure);
  }

  private async _initializeScopeFromInit() {
    await scopeInitDebouncer.wait();
    if (!this.scopeInit || this.scopeInit.trim() === '') return;
    try {
      this.log('Evaluating scope-init expression', this.scopeInit);
      const obj = await evaluateScopeInitExpression(this, this.scopeInit, this.$scope);
      this.log('Scope-init evaluation result', obj);
      Object.assign(this.$scope, obj);
      this.dispatchEvent(new CustomEvent('scope-update'));
    } catch (e) {
      this.error('scope-init evaluation failed', e);
    }
  }

  override updated(changed?: PropertyValues) {
    this.log('update(): Property change', changed);
    const listener = () => {
      this._updateScope();
      this._renderTemplates();
    };

    for (const key of this.updateOn.replace(',', ' ').split(' ')) {
      if (key.trim() === '') continue;
      this.removeEventListener(key, listener);
      this.addEventListener(key, listener);
    }

    if (changed?.has?.('scopeInit')) {
      this._initializeScopeFromInit().then(() => listener());
    }
  }

  override async connectedCallback() {
    await waitForDomContentLoaded();
    super.connectedCallback();
    this.log('Connected', this.$scope);
    this._initializeScopeFromInit()
      .catch(() => void 0)
      .finally(() => {
        this._updateScope();
        this._renderTemplates();
      });
  }
}

declare global {
  interface TjHtmlScope {
    updateOn: string; // Comma-separated list of events to trigger updates
    debug?: boolean;
    scopeInit?: string;
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
