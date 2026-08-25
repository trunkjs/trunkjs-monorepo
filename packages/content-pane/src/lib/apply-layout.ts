import { create_element } from '@trunkjs/browser-utils';
import { TjErrorElement } from '../components/tj-error-element/ErrorElement';
import { parseSelector } from '../tools/parse-selector';

type ApplyLayoutOptions = {
  recursive?: boolean;
};

export interface ManualBeforeLayoutElement {
  beforeLayoutCallback(origElement: HTMLElement, instance: this, children: Element[]): void | boolean;
}

function isManualBeforeLayoutElement(element: any): element is ManualBeforeLayoutElement {
  return typeof (element as ManualBeforeLayoutElement).beforeLayoutCallback === 'function';
}

function applyLayoutToElement(
  element: HTMLElement,
  options: ApplyLayoutOptions,
  layoutOrig: string,
): { replacementElement: HTMLElement; skipChildren: boolean } {
  const regex = /^(=|\+|!|-|\/|)([0-9]+(?:\.[0-9]+)?|);?/;
  const layout = layoutOrig.replace(regex, '');
  const elementDef = parseSelector(layout);

  const origAttrs = Array.from(element.attributes).reduce(
    (acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    },
    {} as Record<string, string>,
  );

  const newElementAttrs = origAttrs;
  if (elementDef.classes.length > 0) {
    newElementAttrs['class'] = (newElementAttrs['class'] ? newElementAttrs['class'] + ' ' : '') + elementDef.classes.join(' ');
  }
  if (elementDef.id) newElementAttrs['id'] = elementDef.id;

  const tag = elementDef.tag || 'section';
  let skipChildren = false;
  let replacementElement = create_element(tag, { ...newElementAttrs, layoutOrig });
  if (tag.includes('-') && !customElements.get(tag)) {
    console.warn(`Custom element <${tag}> is not registered.`);
    replacementElement = new TjErrorElement(`Custom element <${tag}> is not registered.`, element.outerHTML);
    element.replaceWith(replacementElement);
    replacementElement.append(element);
    skipChildren = true;
  } else {
    const children = Array.from(element.children);
    if (isManualBeforeLayoutElement(replacementElement)) {
      skipChildren = replacementElement.beforeLayoutCallback(element, replacementElement, children) === false;
    }
    // @ts-expect-error
    replacementElement.__ORIG_ELEMENT__ = element;
    replacementElement.append(...Array.from(element.children));
    element.replaceWith(replacementElement);
  }

  return { replacementElement, skipChildren };
}

export function applyLayout(
  element: HTMLElement | Element | Element[],
  options: ApplyLayoutOptions = {},
): HTMLElement[] {
  const { recursive = true } = options;
  const ret: HTMLElement[] = [];

  if (Array.isArray(element)) {
    element.forEach((el) => ret.push(...applyLayout(el, options)));
    return ret;
  } else if (!(element instanceof HTMLElement)) {
    return [];
  }

  const layoutOrig = element.getAttribute('layout');
  let skipChildren = false;
  let replacementElement: HTMLElement = element as HTMLElement;
  if (layoutOrig) ({ replacementElement, skipChildren } = applyLayoutToElement(element, options, layoutOrig));

  if (recursive && !skipChildren) {
    Array.from(replacementElement.children).forEach((child) => ret.push(...applyLayout(child as HTMLElement, options)));
  }
  return ret;
}
