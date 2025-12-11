import { create_element } from '@trunkjs/browser-utils';

export type IType = {
  /**
   * Number  10 - 60 - 2.5 -> 25
   */
  i: number;
  variant: 'append' | 'new' | 'skip';

  tag: 'hr' | 'h';
  hi?: number | null; // Only available for headers
};

export interface SectionTreeElement {
  __IT: IType;
}

export function isSectionTreeElement(obj: any): obj is SectionTreeElement {
  return obj && typeof obj === 'object' && '__I__' in obj && typeof obj.__I__ === 'object' && 'i' in obj.__I__;
}

export class SectionTreeBuilder {
  private rootNode: HTMLElement;
  private currentContainerNode: HTMLElement | null = null;
  private containerPath: HTMLElement[] = [];
  private containerIndex: number[] = [0];
  constructor(
    rootNode: HTMLElement,
    public debug = false,
  ) {
    this.currentContainerNode = this.rootNode = rootNode;
    this.containerPath.push(this.rootNode);
  }

  private lastFixedI = 20;

  private getI(element: HTMLElement): IType | null {
    const tagname = element.tagName;
    const layout = element.getAttribute('layout');
    const ret = { i: -99, variant: 'new', tag: 'hr', hi: null } as IType;
    if (layout) {
      const regex = /^(\+|-|)([0-9]\.?[0-9]?|)(;|$)/;
      const matches = layout.match(regex);
      if (matches) {
        ret.variant = matches[1] === '+' ? 'append' : matches[1] === '-' ? 'skip' : 'new';
        if (matches[2] !== '') {
          ret.i = parseFloat(matches[2]) * 10; // Convert to 10s scale
        }
      }
    }

    if (tagname.startsWith('H') && tagname.length === 2) {
      let val = tagname.substring(1);
      ret.tag = 'h';
      ret.hi = parseInt(val);
      if (val === '1') {
        val = '2'; // Treat H1 as H2
      }
      // If the tag is H1-H6, set i based on the tag name
      if (ret.i === -99) {
        // Only set if not already set by layout
        ret.i = parseInt(val) * 10; // Convert to 10s scale
        this.lastFixedI = ret.i;
      }

      return ret;
    }

    if (ret.i === -99 && tagname === 'HR' && layout !== null) {
      // Only if layout is specified for HR - otherwise skip HR nodes
      ret.i = this.lastFixedI + 5; // HRs are always 5 after the last fixed i
      return ret;
    }

    return null;
  }

  protected getAttributeRecords(originalNode: HTMLElement, isHR = false): Record<string, string> {
    const attributes: Record<string, string> = {};
    // @ts-expect-error Attbiutes is not a standard property, but used in this context
    for (const attr of originalNode.attributes) {
      if (attr.name.startsWith('section-')) {
        // stip the section- prefix
        attributes[attr.name.replace(/^section-/, '')] = attr.value;
      } else if (attr.name.startsWith('layout')) {
        // Copy layout attributes without the "layout-" prefix
        attributes[attr.name] = attr.value;
        // Remove the layout attribute from the original node
        originalNode.removeAttribute(attr.name);
      } else if (isHR) {
        // Copy all attributes if copyAll is true
        attributes[attr.name] = attr.value;
      }
    }
    if (!isHR) {
      // Copy classes with "section-" prefix
      for (const className of Array.from(originalNode.classList)) {
        if (className.startsWith('section-')) {
          attributes['class'] = (attributes['class'] || '') + ' ' + className.replace(/^section-/, '');
          // Remove the class from the original node
          originalNode.classList.remove(className);
        }
      }
    }
    return attributes;
  }

  protected createNewContainerNode(originalNode: HTMLElement, it: IType): HTMLElement {
    // Join all layout classes
    // If original Node is HR - copy all classes and attributes
    const attributes = this.getAttributeRecords(originalNode, originalNode.tagName === 'HR');
    const newContainerNode = create_element('section', attributes) as HTMLElement & SectionTreeElement;
    newContainerNode.__IT = it;

    return newContainerNode;
  }

  protected arrangeSingleNode(node: HTMLElement, it: IType) {
    let i = it.i;
    let j = 0;
    for (j = 0; j < this.containerIndex.length; j++) {
      if (this.containerIndex[j] >= it.i) {
        break;
      }
    }

    let containerNode = null;
    if (it.variant === 'append') {
      containerNode = this.containerPath[j];
    } else {
      containerNode = this.createNewContainerNode(node, it);
    }

    const curContainer = this.containerPath[j - 1];
    this.containerPath.length = j;
    this.containerIndex.length = j;
    // Create new Node and apply attributes from original node

    if (node.tagName === 'HR') {
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute('hidden', 'hidden');
    }

    containerNode.appendChild(node);
    curContainer.appendChild(containerNode);

    this.containerPath.push(containerNode);
    this.containerIndex.push(it.i);
    this.currentContainerNode = containerNode;
  }

  private appendToCurrentContainer(node: Node) {
    if (this.currentContainerNode === null) {
      throw new Error('No current container node set');
    }
    this.currentContainerNode.appendChild(node);
  }

  public arrange(nodes: Node[]) {
    for (let curNode of nodes) {
      if (curNode.nodeType !== Node.ELEMENT_NODE) {
        this.appendToCurrentContainer(curNode);
        continue;
      }
      const element = curNode as HTMLElement;
      const it = this.getI(element);
      if (!it || it.variant === 'skip') {
        // skip this node
        this.appendToCurrentContainer(curNode);
        continue;
      }

      this.arrangeSingleNode(element, it);
    }
  }
}
