

export function attrAssign(element: HTMLElement, multiQuerySelector: string, attributes: Record<string, string>): HTMLElement[] {
  let ret : HTMLElement[] = [];
  const queries = multiQuerySelector.split('|');
  for (const query of queries) {
    const nodes = element.querySelectorAll(query.trim());
    if (nodes.length > 0) {
      for (const node of nodes) {
        ret.push(node as HTMLElement);
        // Assign attributes to the node
        for (const [key, value] of Object.entries(attributes)) {
          node.setAttribute(key, value);
        }
      }
    }
  }
  return ret;


}
