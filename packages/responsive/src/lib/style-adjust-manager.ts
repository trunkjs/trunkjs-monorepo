import { breakpoints } from '@trunkjs/browser-utils';
import {
  getStyleEntryAsString,
  getSTyleEntryValueAsString,
  parseStyleAttribute,
  StyleEntry,
} from './style-attribute-parser';

export function adjustElementStyle(element: HTMLElement, curWidth: number) {
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
      if (!element.style[entry[0] as any]) {
        element.style.setProperty(entry[0], 'unset');
      }
    }
  }
  if (!hasResponsiveStyles) return;

  if (!styleBpMap['xs']) {
    // First update - create the original styles of all observed styles
    const initialValues: StyleEntry[] = [];
    for (const prop of observedStyles) {
      const value = element.style.getPropertyValue(prop) || '';
      const priority = element.style.getPropertyPriority(prop) === 'important' ? 'important' : undefined;
      initialValues.push([prop, value, priority]);
    }
    styleBpMap['xs'] = initialValues;
    element.setAttribute('style-xs', getStyleEntryAsString(initialValues));
  }
  const styleResult = new Map<string, string>();
  for (const bp of breakpoints) {
    if (curWidth >= bp.minWidth) {
      if (styleBpMap[bp.name]) {
        // Apply styles for this breakpoint
        const styles = styleBpMap[bp.name];
        for (const entry of styles) {
          styleResult.set(entry[0], getSTyleEntryValueAsString(entry));
        }
      }
    }
  }

  for (const [prop, value] of styleResult) {
    element.style.setProperty(prop, value);
  }
}
