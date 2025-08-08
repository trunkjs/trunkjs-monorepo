import { AstHtmlElement } from './ast-type';

export class Element2Function {
  protected wrapStrucutre(element: AstHtmlElement, code: string): string {
    const wrapper: { start: string; end: string }[] = [];
    for (const attr of element.attributes || []) {
      if (!attr.name.startsWith('*')) {
        continue;
      }
      if (attr.name === '*if') {
        wrapper.push({
          start: `(${attr.value}) === true ? ()=>{lastIf=true; return `,
          end: '} : ()=>{lastIf=false; return ""}',
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

  public parseElement(element: AstHtmlElement): string {
    let ret = ``;
    if (element.type === 'element') {
      ret += `<${element.tagName}`;
      if (element.attributes) {
        for (const attr of element.attributes) {
          ret += ` ${attr.name}`;
          if (attr.value !== undefined) {
            ret += `="${attr.value}"`;
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
      ret += element.textContent || '';
    } else {
      // Handle other types if necessary
    }

    return this.wrapStrucutre(element, ret);
  }

  public buildFunctionBody(element: AstHtmlElement[], scope: object): string {
    let code = '';
    for (const el of element) {
      code += this.parseElement(el);
    }
    const retCode = `return $$__html\`${code}\`;`;
    //const fn = new Function(...Object.keys(scope), `return html\`${code}\`;`);
    return retCode;
  }

  public buildFunction(element: AstHtmlElement[], scope: object): any {
    const code = this.buildFunctionBody(element, scope);

    const fn = new Function(...Object.keys(scope), code);
    return fn;
  }
}
