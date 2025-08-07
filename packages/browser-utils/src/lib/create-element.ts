type Attrs = Record<string, string | true | null | undefined>;

export function create_element(
    tag: string,
    attrs: Attrs = {},
    children: (Node | string)[] | string | Node = []
): HTMLElement {
    if ( ! Array.isArray(children)) {
        children = [children];
    }
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (attrs[k] !== null && attrs[k] !== undefined) {
        el.setAttribute(k, attrs[k] !== true ? attrs[k] : '');
      }
    }
    for (const c of children)
        el.append(typeof c === 'string' ? document.createTextNode(c) : c);
    return el;
}
