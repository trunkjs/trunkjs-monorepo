import { render, type TemplateResult } from 'lit-html';
import { Element2Function } from '../parser/Element2Function';
import { Html2AstParser } from '../parser/Html2AstParser';
import { litEnv, ProlitGeneratedRendererFn } from './lit-env';
import { ScopeDefinition } from './scopeDefine';

export class ProLitTemplate {
  private templateString: string;
  private fn: ProlitGeneratedRendererFn | null = null;
  public scope: ScopeDefinition | null = null;

  constructor(template: string, scope?: ScopeDefinition) {
    // Implementation of the Template class
    this.templateString = template;
    if (scope) {
      scope.$tpl = this; // Set the template in the scope
      this.scope = scope;
    }
  }

  private getCompiledTemplate(): ProlitGeneratedRendererFn {
    if (this.fn) {
      // If the function is already built, return it
      return this.fn;
    }
    this.fn = prolit_compile(this.templateString);
    return this.fn;
  }

  /** Bind without allowing a shared template instance to overwrite another scope. */
  bindScope(scope: ScopeDefinition): ProLitTemplate {
    if (this.scope && this.scope !== scope) {
      const copy = new ProLitTemplate(this.templateString);
      copy.fn = this.fn;
      copy.scope = scope;
      return copy;
    }
    this.scope = scope;
    return this;
  }

  /** Return a Lit template. Mount via prolit(scope) for lifecycle and automatic updates. */
  render(): TemplateResult {
    if (!this.scope) {
      throw new Error('Scope is not defined. Please define a scope using scopeDefine.');
    }
    const tplFn = this.getCompiledTemplate();
    return tplFn(this.scope, litEnv(tplFn, this.templateString, this.scope));
  }

  /**
   * Render this template into a non shadow DOM element.
   *
   * @param element
   */
  renderIntoElement(element: HTMLElement): void {
    if (!element) {
      throw new Error('Element is not defined. Please provide a valid HTMLElement to render into.');
    }
    render(this.render(), element);
  }

  /**
   * Render the template to a non shadow DOM element.
   *
   * @param element
   */
  renderInElement(element: HTMLElement): void {
    this.renderIntoElement(element);
  }
}

export function prolit_compile(templateString: string): ProlitGeneratedRendererFn {
  const ast = new Html2AstParser().parse(templateString);
  return new Element2Function().buildFunction(ast);
}

export function prolit_html(strings: TemplateStringsArray, ...values: any[]): ProLitTemplate {
  // The scope will be set by the scopeDefine function
  return new ProLitTemplate(
    strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), ''),
  );
}
