import {parseSelector} from "../../tools/mini-parsers/html-parsers";
import {create_element} from "../../tools/create-element";
import {TjErrorElement} from "@/error-element/ErrorElement";

type ApplyLayoutOptions = {
  recursive?: boolean;
}




export interface ManualBeforeLayoutElement {
  /**
   * This callback is called before the layout is applied to the element. So the orgiginal element is still attached to the DOM
   * and all its children are still present.
   *
   * You should only
   *
   * If the callback returns `false`, the layout engine will not apply the layout to child elements, effectively skipping the layout for this element.
   * In this case, the element has to handle applyLayout() itself, or it will not be applied at all.
   *
   * It can be used to modify the element or its children before the layout is applied.
   * @param origElement The original element that is being replaced
   * @param instance The new element that is being created
   * @param children The children of the original element
   *
   * @example
   * ```typescript
   * beforeLayoutCallback(origElement, instance, elements) {
   *   // Modify the instance or its children before the layout is applied
   *   attrAssign(origElement, ":scope > .aside | :scope > *:has(img)", {slot: "aside"});
   */
  beforeLayoutCallback(origElement: HTMLElement, instance: this, children: Element[]): void | boolean;
}

function isManualBeforeLayoutElement(element: any): element is ManualBeforeLayoutElement {
  return typeof (element as ManualBeforeLayoutElement).beforeLayoutCallback === 'function';
}


function applyLayoutToElement(element: HTMLElement, options: ApplyLayoutOptions, layoutOrig: string): { replacementElement: HTMLElement, skipChildren: boolean } {
  console.log("Applying layout to element:", element, "with layout:", layoutOrig);

  // Apply layout logic here
  // just remove the leading bit defined by the regex from the layout string
  const regex = /^(\+|-|)([0-9]+\.?[0-9]*);?/
  const layout = layoutOrig.replace(regex, '');

  const elementDef = parseSelector(layout);

  let attrs : Record<string, string|null> = {};
  if (attrs["class"] !== undefined) {
    attrs["class"] += " ";
  }
  attrs["class"] += elementDef.classes.join(" ");
  attrs["id"] = elementDef.id

  let tag = elementDef.tag || 'div'; // Default to 'div' if no tag is specified
  let skipChildren = false;
  let replacementElement = create_element(tag, {...attrs, layoutOrig});
  // if tag contains - (assumes a custom element), check if it is registered
  if (tag.includes('-') && !customElements.get(tag)) {
    console.warn(`Custom element <${tag}> is not registered.`);
    replacementElement = new TjErrorElement(`Custom element <${tag}> is not registered.`, element.outerHTML);
    element.replaceWith(replacementElement);
    replacementElement.append(element);
    skipChildren = true; // Skip children since we are replacing the element with an error element (prevents infinite recursion)
  } else {
    let children = Array.from(element.children);


    if (isManualBeforeLayoutElement(replacementElement)) {
      skipChildren = replacementElement.beforeLayoutCallback(element, replacementElement, children) === false;
    }
    console.log("Replacement element created:", replacementElement, "with children:", children, "skipChildren:", skipChildren);

    // @ts-expect-error
    replacementElement.__ORIG_ELEMENT__ = element; // Store the original element for reference
    replacementElement.append(...Array.from(element.children));
    element.replaceWith(replacementElement);
  }

  return {
    replacementElement,
    skipChildren
  }
}



export function applyLayout(element: HTMLElement | Element | Element[], options: ApplyLayoutOptions = {}): HTMLElement[] {
  console.log("applyLayout called with element:", element, "and options:", options);
  const { recursive = true } = options;

  let ret : HTMLElement[] = [];


  if (Array.isArray(element)) {
    element.forEach((el) => ret.push(...applyLayout(el, options)));
    return ret;
  } else if ( ! (element instanceof HTMLElement)) {
    return [];
  }


  // For example, you might want to add a class or set styles
  const layoutOrig = element.getAttribute('layout');
  let skipChildren = false;
  let replacementElement: HTMLElement = element as HTMLElement;
  if (layoutOrig) {
      ({replacementElement, skipChildren} = applyLayoutToElement(element, options, layoutOrig));
  }



  if (recursive && ! skipChildren) {
    const children = Array.from(replacementElement.children);
    console.log("Applying layout to children:", children, "of element:", replacementElement);
    children.forEach((child) => ret.push(...applyLayout(child as HTMLElement, options)));
  }
  return ret;
}
