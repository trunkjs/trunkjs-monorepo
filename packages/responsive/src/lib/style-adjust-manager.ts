import { getStyleEntryAsString, parseStyleAttribute, StyleEntry } from './style-attribute-parser';

export function adjustElementStyle(element: HTMLElement, breakpoint: string) {
  // Get all Attribute-Names starting with "style-"
  const styleAttributes = Array.from(element.attributes).filter((attr) => attr.name.startsWith('style-'));
  const styleBpMap: Record<string, StyleEntry[]> = {};
  let hasResponsiveStyles = false;
  const observedStyles: Set<string> = new Set();
  for (const attr of styleAttributes) {
    const bp = attr.name.substring('style-'.length);
    const stylesEntries = (styleBpMap[bp] = parseStyleAttribute(attr.value || ''));
    hasResponsiveStyles = true;
    for (const entry of stylesEntries) {
      observedStyles.add(entry[0]);
    }
  }
  if (!hasResponsiveStyles) return;

  if (!styleBpMap['xs']) {
    // First update - create the original styles of all observed styles
    const origStyles = parseStyleAttribute(element.getAttribute('style') || '');
    // Filter only the observed styles
    const filteredOrigStyles = origStyles.filter((entry) => observedStyles.has(entry[0]));
    styleBpMap['xs'] = filteredOrigStyles;
    element.setAttribute('style-xs', getStyleEntryAsString(filteredOrigStyles));
  }
}
