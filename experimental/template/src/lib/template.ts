import { getErrorLocation } from '@trunkjs/browser-utils';
import { render } from 'lit-html';
import { Element2Function } from '../parser/Element2Function';
import { Html2AstParser } from '../parser/Html2AstParser';
import { ScopeDefinition } from './scopeDefine';

export class Template {
  private templateString: string;
  private fn: any = null;
  public scope: ScopeDefinition | null = null;

  constructor(template: string, scope?: ScopeDefinition) {
    // Implementation of the Template class
    this.templateString = template;
    if (scope) {
      scope.$tpl = this; // Set the template in the scope
      this.scope = scope;
    }
  }

  private getRenderedTemplate(): any {
    if (!this.scope) throw new Error('Scope is not defined. Please define a scope using scopeDefine.');

    if (this.fn) {
      // If the function is already built, return it
      return this.fn;
    }

    console.log('Rendering template with scope:', this.scope, this.templateString);
    const ast = new Html2AstParser().parse(this.templateString);
    this.fn = new Element2Function().buildFunction(ast, this.scope);
    return this.fn;
  }

  render() {
    const tplFn = this.getRenderedTemplate();
    try {
      return tplFn(...Object.values(this.scope || {}));
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
   * Render the template to a non shadow DOM element.
   *
   * @param element
   */
  renderInElement(element: HTMLElement): void {
    render(this.render(), element);
  }
}

export function template(strings: TemplateStringsArray, ...values: any[]): Template {
  // The scope will be set by the scopeDefine function
  return new Template(strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), ''));
}
