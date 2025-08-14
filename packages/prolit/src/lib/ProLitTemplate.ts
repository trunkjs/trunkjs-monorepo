import { getErrorLocation } from '@trunkjs/browser-utils';
import { render } from 'lit-html';
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
    const ast = new Html2AstParser().parse(this.templateString);
    this.fn = prolit_compile(this.templateString);
    return this.fn;
  }

  /**
   * Returns the rendered template
   *
   *
   * @example
   *
   * ```typescript
   * override render() {
   *   return this.$tpl.render();
   * }
   * ````
   *
   */
  render() {
    if (!this.scope) {
      throw new Error('Scope is not defined. Please define a scope using scopeDefine.');
    }
    const tplFn = this.getCompiledTemplate();
    try {
      return tplFn(this.scope, litEnv());
    } catch (error) {
      if (error instanceof Error && error.stack) {
        const lineNo = getErrorLocation(error as Error).line;
        // extract the line from tplFn.toString()
        const lines = tplFn.toString().split('\n');
        const errorLine = lines[(lineNo ?? 1) - 1] || '';
        throw new Error(
          `Error rendering template at line ${lineNo}:\n${errorLine}\n\nOriginal error: ${error.message}`,
        );
      }
      throw error;
    }
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
    render(this.render(), element);
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
