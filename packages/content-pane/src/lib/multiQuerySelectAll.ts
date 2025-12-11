export function multiQuerySelectAll(qurey: string, element: HTMLElement): HTMLElement[] {
  const ret: HTMLElement[] = [];
  const queries = qurey.split('|');
  for (const query of queries) {
    const nodes = element.querySelectorAll(query.trim());
    if (nodes.length > 0) {
      return Array.from(nodes) as HTMLElement[];
    }
  }
  return [];
}
