import { create_element, Debouncer, LoggingMixin, waitForDomContentLoaded } from '@trunkjs/browser-utils';
import { ProLitTemplate, scopeDefine, ScopeDefinition } from '@trunkjs/prolit';
import { PropertyValues, ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { deepMerge } from '../../utils/deep-merge';
import { evalImportSrc } from '../../utils/eval-import-src';
import { loadExternalSrc, SrcReturn } from '../../utils/load-external-src';
import { loadInlineTemplate } from '../../utils/loadInlineTemplate';
import { evaluateScopeInitExpression } from '../../utils/scope-init';

@customElement('prolit-scope')
export class ProlitScope extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn = 'change keyup click';

  @property({ type: String, reflect: true, attribute: 'init' })
  public scopeInit?: string;

  @property({ type: String, reflect: false, attribute: 'src' })
  public src = '';

  private srcData: SrcReturn | null = null;

  private renderInElement: HTMLElement;

  private myProLitTemplate: ProLitTemplate | null = null;

  public $scope: ScopeDefinition;

  #scopeInitDebouncer: Debouncer;

  #isFirstRender = true;

  constructor() {
    super();
    this.$scope = scopeDefine({});
    this.renderInElement = create_element('div', { style: 'display: contents' });

    this.#scopeInitDebouncer = new Debouncer(50, 200);
  }

  override createRenderRoot() {
    // We don't want to use a shadow DOM, so we return the host element itself
    return this;
  }

  private async _renderTemplates(reload = false) {
    if (!this.myProLitTemplate || reload) {
      let templateString: string;
      if (this.srcData) {
        templateString = this.srcData.template;
      } else {
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
        let template = templates[0];
        template = await evalImportSrc(template, this.getLogger('evalImportSrc'));
        templateString = template.innerHTML;
      }

      this.myProLitTemplate = new ProLitTemplate(templateString, this.$scope);
    }

    // Render the template in the element

    this.myProLitTemplate.renderInElement(this.renderInElement);

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
    await this.#scopeInitDebouncer.wait();

    const scope = {};
    if (this.src && this.src.trim() !== '') {
      this.log('Loading external src', this.src);
      this.srcData = await loadExternalSrc(this.src, this.getLogger('loadExternalSrc'));
      this.log('External src loaded', this.srcData);
    } else {
      this.srcData = loadInlineTemplate(this, this.getLogger('loadInlineTemplate'));
      this.log('Inline template loaded', this.srcData);
    }
    deepMerge(scope, this.srcData.scope);

    if (this.scopeInit && this.scopeInit.trim() !== '') {
      try {
        this.log('Evaluating scope-init expression', this.scopeInit);
        const obj = await evaluateScopeInitExpression(this, this.scopeInit, this.$scope);
        this.log('Scope-init evaluation result', obj);
        deepMerge(scope, obj);
      } catch (e) {
        this.error('scope-init evaluation failed', e);
      }
    }
    // Append the renderInElement
    this.appendChild(this.renderInElement);

    Object.assign(this.$scope, scope);
    this.dispatchEvent(new CustomEvent('scope-update'));
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
    TjHtmlScope: typeof ProlitScope;
  }

  interface HTMLElementEventMap {
    'scope-update': CustomEvent<void>;
  }

  interface ElementEventMap {
    'scope-update': CustomEvent<void>;
  }
}
