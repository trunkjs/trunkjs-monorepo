import { parseSelector } from '../tools/parse-selector';

export interface ContentPanePreParser {
  readonly name: string;

  parse(root: HTMLElement): void;
}

const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const textNodeType = 3;
const showText = 4;

interface ParsedAttribute {
  name: string;
  value?: string;
}

export class TextBlockPreParser implements ContentPanePreParser {
  readonly name = 'text-block';

  parse(root: HTMLElement): void {
    const elements = Array.from(root.querySelectorAll<HTMLElement>('*')).reverse();

    for (const element of elements) {
      if (!element.innerHTML.includes('#[')) continue;

      const replacement = this.parseLine(element.innerHTML, root.ownerDocument);
      if (replacement) element.replaceWith(replacement);
    }

    const walker = root.ownerDocument.createTreeWalker(root, showText);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === textNodeType && node.textContent?.includes('#[')) textNodes.push(node as Text);
    }

    for (const textNode of textNodes) this.parseTextNode(textNode);
  }

  private parseTextNode(textNode: Text): void {
    const text = textNode.data;
    const parts = text.split(/(\r?\n)/);
    const fragment = textNode.ownerDocument.createDocumentFragment();
    let changed = false;

    for (const part of parts) {
      if (/^\r?\n$/.test(part)) {
        fragment.append(part);
        continue;
      }

      const replacement = this.parseLine(part, textNode.ownerDocument);
      if (replacement) {
        fragment.append(replacement);
        changed = true;
      } else {
        fragment.append(part);
      }
    }

    if (changed) textNode.replaceWith(fragment);
  }

  private parseLine(line: string, document: Document): HTMLElement | null {
    const match = line.match(/^\s*#\[(.*)\]\s*$/);
    if (!match || match[1].includes('#[')) return null;

    // Decodes quotes escaped by innerHTML so text-block attributes retain their intended values.
    const source = match[1]
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .replaceAll('&#x27;', "'")
      .replaceAll('“', '"')
      .replaceAll('”', '"')
      .replaceAll('‘', "'")
      .replaceAll('’', "'");

    try {
      return this.createElement(source, document);
    } catch (error) {
      console.warn('[tj-content-pane] Unable to parse text block:', line, error);
      return null;
    }
  }

  private createElement(source: string, document: Document): HTMLElement {
    const { definition, content } = this.splitContent(source);
    if (!/^[a-z][\w-]*/i.test(definition)) throw new Error('The text block must start with an element name.');

    const selector = parseSelector(definition, { allowAttributes: true });
    const attributeSource = selector.rest.trim();
    const element = document.createElement(selector.tag);

    if (selector.id) element.id = selector.id;
    element.classList.add(...selector.classes);

    for (const attribute of selector.attrs) this.applyAttribute(element, attribute);
    for (const attribute of this.parseAttributes(attributeSource)) this.applyAttribute(element, attribute);

    if (content !== undefined) {
      if (voidElements.has(selector.tag.toLowerCase())) {
        throw new Error(`The void element <${selector.tag}> cannot have content.`);
      }
      element.innerHTML = content.trim();
    }

    return element;
  }

  private splitContent(source: string): { definition: string; content?: string } {
    let quote: '"' | "'" | null = null;

    for (let index = 0; index < source.length; index++) {
      const character = source[index];

      if (quote) {
        if (character === quote) quote = null;
        continue;
      }

      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }

      if (character === '>') {
        return { definition: source.slice(0, index).trim(), content: source.slice(index + 1) };
      }

      if (source.startsWith('&gt;', index)) {
        return { definition: source.slice(0, index).trim(), content: source.slice(index + 4) };
      }
    }

    return { definition: source.trim() };
  }

  private parseAttributes(source: string): ParsedAttribute[] {
    if (!source) return [];

    const attributes: ParsedAttribute[] = [];
    const attributePattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gy;
    let index = 0;

    while (index < source.length) {
      while (/\s/.test(source[index] ?? '')) index++;
      if (index >= source.length) break;

      attributePattern.lastIndex = index;
      const match = attributePattern.exec(source);
      if (!match || match.index !== index) throw new Error(`Invalid attribute syntax near '${source.slice(index)}'.`);

      const hasValue = match[0].includes('=');
      attributes.push({ name: match[1], value: hasValue ? (match[2] ?? match[3] ?? match[4] ?? '') : undefined });
      index = attributePattern.lastIndex;
    }

    return attributes;
  }

  private applyAttribute(element: HTMLElement, attribute: ParsedAttribute): void {
    if (attribute.name.toLowerCase() === 'class' && attribute.value) {
      element.classList.add(...attribute.value.split(/\s+/).filter(Boolean));
      return;
    }

    element.setAttribute(attribute.name, attribute.value ?? '');
  }
}
