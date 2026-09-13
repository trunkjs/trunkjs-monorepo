import { create_element } from '@trunkjs/browser-utils';
import { parseSelector } from '../tools/parse-selector';

const layoutPrefixRegex = /^(=|\+|!|-|\/|)([0-9]+(?:\.[0-9]+)?|)(;|$)/;

export type IType = {
  /** Number 10 - 60 - 2.5 -> 25 */
  i: number;
  variant: 'append' | 'new' | 'skip' | 'close';
  tag: 'hr' | 'h';
  hi?: number | null;
};

export interface SectionTreeElement {
  __IT: IType;
}

export function isSectionTreeElement(obj: any): obj is SectionTreeElement {
  return obj && typeof obj === 'object' && '__IT' in obj && typeof obj.__IT === 'object' && 'i' in obj.__IT;
}

export class SectionTreeBuilder {
  private rootNode: HTMLElement;
  private currentContainerNode: HTMLElement | null = null;
  private containerPath: HTMLElement[] = [];
  private containerIndex: number[] = [0];
  private controlLayoutIndex: number[] = [];
  private lastFixedI = 20;

  constructor(
    rootNode: HTMLElement,
    public debug = false,
  ) {
    this.currentContainerNode = this.rootNode = rootNode;
    this.containerPath.push(this.rootNode);
  }

  private getI(element: HTMLElement): IType | null {
    const tagname = element.tagName;
    const layout = element.getAttribute('layout');
    const ret = { i: -99, variant: 'new', tag: 'hr', hi: null } as IType;

    if (layout) {
      const matches = layout.match(layoutPrefixRegex);
      if (matches) {
        const op = matches[1];
        ret.variant = op === '=' || op === '+' ? 'append' : op === '!' || op === '-' ? 'skip' : op === '/' ? 'close' : 'new';
        if (matches[2] !== '') ret.i = parseFloat(matches[2]) * 10;
      }
    }

    if (tagname === 'HR' && layout === null) return null;

    if (ret.variant === 'close') {
      if (tagname !== 'HR') throw new Error('layout close syntax (/i;) is only supported on HR control elements');
      if (ret.i === -99) {
        const currentControlI = this.controlLayoutIndex[this.controlLayoutIndex.length - 1];
        if (currentControlI === undefined) throw new Error('Cannot close current layout level: no open HR layout wrapper');
        ret.i = currentControlI;
      }
      return ret;
    }

    if (tagname === 'HR') {
      if (ret.i === -99) ret.i = this.lastFixedI + 5;
      else this.lastFixedI = ret.i;
      return ret;
    }

    if (tagname.startsWith('H') && tagname.length === 2) {
      let val = tagname.substring(1);
      ret.tag = 'h';
      ret.hi = parseInt(val);
      if (val === '1') val = '2';
      if (ret.i === -99) ret.i = parseInt(val) * 10;
      this.lastFixedI = ret.i;
      return ret;
    }

    return null;
  }

  private stripControlOnlyLayout(element: HTMLElement) {
    const layout = element.getAttribute('layout');
    if (!layout) return;
    const match = layout.match(layoutPrefixRegex);
    if (match && layout.slice(match[0].length).trim() === '') element.removeAttribute('layout');
  }

  protected getAttributeRecords(originalNode: HTMLElement, isHR = false): Record<string, string> {
    const attributes: Record<string, string> = {};
    const layout = originalNode.getAttribute('layout');
    let parsedLayout: ReturnType<typeof parseSelector> | null = null;

    if (layout) {
      const layoutWithoutI = layout.replace(layoutPrefixRegex, '').trim();
      if (layoutWithoutI !== '') parsedLayout = parseSelector(layoutWithoutI);
    }

    for (const attr of Array.from(originalNode.attributes)) {
      if (attr.name.startsWith('section-')) {
        attributes[attr.name.replace(/^section-/, '')] = attr.value;
      } else if (attr.name.startsWith('layout')) {
        attributes[attr.name] = attr.value;
        originalNode.removeAttribute(attr.name);
      } else if (isHR) {
        attributes[attr.name] = attr.value;
        originalNode.removeAttribute(attr.name);
      }
    }

    if (!isHR) {
      Array.from(originalNode.classList).forEach((className) => {
        if (className.startsWith('section-')) {
          attributes['class'] =
            (attributes['class'] ? attributes['class'] + ' ' : '') + className.replace(/^section-/, '');
          originalNode.classList.remove(className);
        }
      });
    }

    if (parsedLayout) {
      parsedLayout.classes.forEach((className) => {
        attributes['class'] = (attributes['class'] ? attributes['class'] + ' ' : '') + className + ' ';
      });
      parsedLayout.attrs.forEach((attr) => {
        attributes[attr.name] = attr.value ?? '';
      });
      parsedLayout.id && (attributes['id'] = parsedLayout.id);
    }

    return attributes;
  }

  protected createNewContainerNode(originalNode: HTMLElement, it: IType): HTMLElement {
    const attributes = this.getAttributeRecords(originalNode, originalNode.tagName === 'HR');
    const newContainerNode = create_element('section', attributes) as HTMLElement & SectionTreeElement;
    newContainerNode.__IT = it;
    return newContainerNode;
  }

  protected arrangeSingleNode(node: HTMLElement, it: IType) {
    let j = 0;
    for (j = 0; j < this.containerIndex.length; j++) {
      if (this.containerIndex[j] >= it.i) break;
    }

    let containerNode: HTMLElement;
    if (it.variant === 'append') {
      const existing = this.containerPath[j];
      if (!existing || this.containerIndex[j] !== it.i) {
        throw new Error(`Cannot append to layout level ${it.i / 10}: no existing section at this level`);
      }
      containerNode = existing;
      this.stripControlOnlyLayout(node);
    } else {
      containerNode = this.createNewContainerNode(node, it);
    }

    const curContainer = this.containerPath[j - 1];
    if (!curContainer) throw new Error(`Cannot create layout level ${it.i / 10}: no parent container`);

    this.containerPath.length = j;
    this.containerIndex.length = j;

    if (node.tagName === 'HR') {
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute('hidden', 'hidden');
    }

    containerNode.appendChild(node);
    curContainer.appendChild(containerNode);
    this.containerPath.push(containerNode);
    this.containerIndex.push(it.i);
    this.currentContainerNode = containerNode;

    if (node.tagName === 'HR' && it.variant === 'new') this.controlLayoutIndex.push(it.i);
  }

  private closeLevel(i: number) {
    while (this.containerIndex.length > 1 && this.containerIndex[this.containerIndex.length - 1] >= i) {
      this.containerIndex.pop();
      this.containerPath.pop();
    }
    while (this.controlLayoutIndex.length && this.controlLayoutIndex[this.controlLayoutIndex.length - 1] >= i) {
      this.controlLayoutIndex.pop();
    }
    this.currentContainerNode = this.containerPath[this.containerPath.length - 1] ?? this.rootNode;
  }

  private appendToCurrentContainer(node: Node) {
    if (this.currentContainerNode === null) throw new Error('No current container node set');
    this.currentContainerNode.appendChild(node);
  }

  public arrange(nodes: Node[]) {
    for (const curNode of nodes) {
      if (curNode.nodeType !== Node.ELEMENT_NODE) {
        this.appendToCurrentContainer(curNode);
        continue;
      }

      const element = curNode as HTMLElement;
      const it = this.getI(element);
      if (!it) {
        this.appendToCurrentContainer(curNode);
        continue;
      }
      if (it.variant === 'close') {
        if (element.parentNode) element.parentNode.removeChild(element);
        this.closeLevel(it.i);
        continue;
      }
      if (it.variant === 'skip') {
        this.stripControlOnlyLayout(element);
        this.appendToCurrentContainer(curNode);
        continue;
      }

      this.arrangeSingleNode(element, it);
    }
  }
}
