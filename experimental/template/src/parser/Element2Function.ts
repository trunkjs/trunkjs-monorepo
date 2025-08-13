import { AstHtmlElement } from './ast-type';

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
      if (attr.name === '*if') {
        wrapper.push({
          start: `$$__when(${attr.value}, ()=>{lastIf=true; return   `,
          end: '}, ()=>{lastIf=false; return $$__html``})',
        });
        continue;
      }

      if (attr.name === '*for') {
        // <localName> in <array> or localname> of <array>
        const match = /^(.*)\s+(in|of)\s+(.*)$/.exec(attr.value || '');
        if (!match) {
          throw new Error(`Invalid *for attribute value: ${attr.value}`);
        }
        if (match[2] === 'of') {
          wrapper.push({ start: `${match[3]}.map((${match[1]}, index) => `, end: ')' });
        }
        continue;
      }
      throw new Error(`Unknown attribute ${attr.name} in element ${element.tagName}`);
    }

    if (wrapper.length === 0) {
      return code;
    }
    let ret = '$$__html`' + code + '`'; // Start with a template literal for HTML
    for (let i = wrapper.length - 1; i >= 0; i--) {
      ret = wrapper[i].start + ret + wrapper[i].end;
    }
    return '${' + ret + '}'; // Wrap the final result in a string concatenation
  }

  private parseString(str: string): string {
    // Find {{ expression }} and replace with ${expression}
    return str.replace(/{{\s*([^}]+?)\s*}}/g, (match, expression) => {
      return `\${${expression}}`;
    });
  }

  public parseElement(element: AstHtmlElement): string {
    let ret = ``;
    if (element.type === 'element') {
      ret += `<${element.tagName}`;
      if (element.attributes) {
        for (const attr of element.attributes) {
          attr.value = this.htmlEntityDecoer(attr.value || null);
          if (attr.name.startsWith('*')) {
            // Skip attributes that start with '*'
            continue;
          }
          if (attr.name.startsWith('@')) {
            // Handle event attributes (e.g., @click)
            ret += ` ${attr.name}=\${()=>{${attr.value}}}`;
            continue;
          }
          if (attr.name.startsWith('?')) {
            ret += ` ${attr.name}=\${${attr.value}}"`;
            continue;
          }
          if (attr.name === '$ref') {
            ret += ` \${ref($el => { ${attr.value} })}`;
            continue;
          }
          if (attr.name.startsWith('.')) {
            ret += ` ${attr.name}=\${${attr.value}}`;
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
    const retCode = `with($scope){return $$__html\`${code}\`};`;
    //const fn = new Function(...Object.keys(scope), `return html\`${code}\`;`);
    return retCode;
  }

  public buildFunction(element: AstHtmlElement[]): any {
    const code = this.buildFunctionBody(element);
    try {
      const fn = new Function('$scope', code);
      return fn;
    } catch (e) {
      console.log('Error building function:', e);
      throw new SyntaxError(String(e), code, 0, 0);
    }
  }
}
