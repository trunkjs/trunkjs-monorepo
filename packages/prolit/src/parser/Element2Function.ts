import { ProlitGeneratedRendererFn } from '../lib/lit-env';
import { AstHtmlElement } from './ast-type';
import { isValidSyntax } from './syntax-tester';

export class SyntaxError extends Error {
  constructor(message: string, code: string, line: number, column: number) {
    super(`Syntax Error: ${message} at line ${line}, column ${column}\nCode: ${code}`);
    this.name = 'SyntaxError';
  }
}

export class Element2Function {
  protected htmlEntityDecoer(input: string | null): string {
    if (!input) {
      return 'null';
    }
    return new DOMParser().parseFromString(input, 'text/html').body.textContent ?? '';
  }

  protected wrapStrucutre(element: AstHtmlElement, code: string): string {
    const wrapper: { start: string; end: string }[] = [];
    for (const attr of element.attributes || []) {
      if (!attr.name.startsWith('*')) {
        continue;
      }

      if (attr.name === '*for') {
        // <localName> in <array> or <localName> of <array> [; <keyExpr>]
        const match = /^(.*?)\s+(in|of)\s+(.*?)(;(.*?))?$/.exec(attr.value || '');
        if (!match) {
          throw new Error(`Invalid *for attribute value: ${attr.value}`);
        }

        let indexBy = 'null';
        if (match[5]) {
          indexBy = match[1] + ' => ' + match[5].trim();
        }

        this.testSyntax(element, attr.name, match[1]);
        this.testSyntax(element, attr.name, match[3]);
        this.testSyntax(element, attr.name, indexBy);

        if (match[2] === 'of') {
          wrapper.push({ start: `$$__litEnv.repeat(${match[3]}, ${indexBy}, (${match[1]}, $index) => `, end: ')' });
        } else if (match[2] === 'in') {
          wrapper.push({
            start: `$$__litEnv.repeat(Object.keys(${match[3]}), ${indexBy}, (${match[1]}, $index) => `,
            end: ')',
          });
        }
        continue;
      }

      this.testSyntax(element, attr.name, attr.value || '');

      if (attr.name === '*if') {
        this.testSyntax(element, attr.name, attr.value || '');
        wrapper.push({
          start: `$$__litEnv.when(${this.getCatchErrorValue(element, '*if', attr.value!)}, ()=>{lastIf=true; return   `,
          end: '}, ()=>{lastIf=false; return $$__litEnv.html``})',
        });
        continue;
      }

      if (attr.name === '*do') {
        // Execute arbitrary inline code in scope, then return inner html
        wrapper.push({
          start: `(()=>{$$__litEnv.catchError($$__litEnv, ()=>{ ${attr.value}}, true, '*do="${this.escapeStmt(attr.value!)}"'); return `,
          end: '})()',
        });
        continue;
      }

      if (attr.name === '*catch') {
        // Catch errors in the expression, then render inner html
        wrapper.push({
          start: `$$__litEnv.catchError($$__litEnv, () => `,
          end: `)`,
        });
        continue;
      }

      if (attr.name === '*log') {
        // Log the expression result, then render inner html
        wrapper.push({
          start: `(()=>{$$__litEnv.catchError($$__litEnv, ()=>console.log(${attr.value}), true, '*log="${this.escapeStmt(attr.value!)}"'); return `,
          end: '})()',
        });
        continue;
      }

      throw new Error(`Unknown attribute ${attr.name} in element ${element.tagName}`);
    }

    if (wrapper.length === 0) {
      return code;
    }
    let ret = '$$__litEnv.html`' + code + '`'; // Start with a template literal for HTML
    for (let i = wrapper.length - 1; i >= 0; i--) {
      ret = wrapper[i].start + ret + wrapper[i].end;
    }
    return '${' + ret + '}'; // Wrap the final result in a string concatenation
  }

  private escapeStmt(stmt: string): string {
    // Escape backticks and dollar signs in the statement
    return stmt.replace(/'/g, "\\'");
  }

  private getCatchErrorValue(element: AstHtmlElement, attrName: string, code: string): string {
    return `$$__litEnv.catchError($$__litEnv, ()=>(${code}), true, '${this.escapeStmt(attrName + '="' + code + '"')}')`;
  }

  private parseString(str: string): string {
    // Find {{ expression }} and replace with ${expression}
    return str.replace(/{{\s*([^}]+?)\s*}}/g, (match, expression) => {
      return `\${$$__litEnv.catchError($$__litEnv, ()=>${expression}, true, '${this.escapeStmt(match)}')}`;
    });
  }

  private testSyntax(element: AstHtmlElement, attrName: string, code: string): void {
    try {
      isValidSyntax(code);
    } catch (e) {
      throw new SyntaxError(
        // @ts-ignore
        `${e.message} in attribute ${attrName}="${code}" of element ${element.tagName}`,
        code,
        0,
        0,
      );
    }
  }

  public parseElement(element: AstHtmlElement): string {
    let ret = ``;
    if (element.type === 'element') {
      ret += `<${element.tagName}`;
      if (element.attributes) {
        for (const attr of element.attributes) {
          attr.value = this.htmlEntityDecoer(attr.value || null);

          if (['.', ':', '~', '@'].includes(attr.name[0])) {
            // Check the syntax of the attribute
            this.testSyntax(element, attr.name, attr.value || '');
          }
          // This stmt catches all errors during runtim and transforms them into readable messages
          const dbgValStmt = this.getCatchErrorValue(element, attr.name, attr.value || '');

          if (attr.name.startsWith('*')) {
            // Skip attributes that start with '*'
            continue;
          }
          if (attr.name.startsWith('@')) {
            // Handle event attributes (e.g., @click)
            ret += ` ${attr.name}=\${()=>{$$__litEnv.catchError($$__litEnv, ()=>{${attr.value}}, true, '${this.escapeStmt(attr.name + '="' + attr.value + '"')}')}}`;
            continue;
          }
          if (attr.name.startsWith('~')) {
            let fnName = '';
            switch (attr.name) {
              case '~style':
                fnName = 'styleMap';
                break;
              case '~class':
                fnName = 'classMap';
                break;
              default:
                throw new Error(`Unknown directive ${attr.name} in element ${element.tagName}`);
            }
            // Handle directive attributes (e.g., ~style, ~class)
            ret += ` ${attr.name.slice(1)}=\${$$__litEnv.${fnName}(${dbgValStmt})}`;
            continue;
          }
          if (attr.name.startsWith('?')) {
            // Boolean attribute binding (lit): ?attr=${expr}
            ret += ` ${attr.name}=\${${dbgValStmt}}`;
            continue;
          }
          if (attr.name === '$ref') {
            ret += ` \${$$__litEnv.ref($el => { ${dbgValStmt} })}`;
            continue;
          }
          if (attr.name.startsWith('.')) {
            ret += ` ${attr.name}=\${${dbgValStmt}}`;
            continue;
          }

          ret += ` ${attr.name}`;
          if (attr.value !== undefined) {
            ret += `="${this.parseString(attr.value)}"`;
          }
        }
      }
      ret += '>';
      if (element.children) {
        for (const child of element.children) {
          ret += this.parseElement(child);
        }
      }
      if (!element.isVoid) {
        ret += `</${element.tagName}>`;
      }
    } else if (element.type === 'text') {
      ret += this.parseString(element.textContent || '');
    } else {
      // Handle other types if necessary
    }

    return this.wrapStrucutre(element, ret);
  }

  public buildFunctionBody(element: AstHtmlElement[]): string {
    let code = '';
    for (const el of element) {
      code += this.parseElement(el);
    }
    const retCode = `with($scope){return $$__litEnv.html\`${code}\`};`;
    //const fn = new Function(...Object.keys(scope), `return html\`${code}\`;`);
    return retCode;
  }

  public buildFunction(element: AstHtmlElement[]): ProlitGeneratedRendererFn {
    const code = this.buildFunctionBody(element);
    try {
      const fn = new Function('$scope', '$$__litEnv', code);
      return fn as ProlitGeneratedRendererFn;
    } catch (e) {
      console.log('Error building function:', e);
      throw new SyntaxError(String(e), code, 0, 0);
    }
  }
}
