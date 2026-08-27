import { getClassNamesFromToken } from './class-tokenizer';

export interface ArbitraryUtilityDeclaration {
  className: string;
  property: string;
  value: string;
}

interface UtilityLogger {
  warn(...args: unknown[]): void;
}

const utilityProperties: Record<string, string> = {
  width: 'width',
  'min-width': 'min-width',
  'max-width': 'max-width',
  height: 'height',
  'min-height': 'min-height',
  'max-height': 'max-height',
  'aspect-ratio': 'aspect-ratio',
  margin: 'margin',
  'margin-top': 'margin-top',
  'margin-right': 'margin-right',
  'margin-bottom': 'margin-bottom',
  'margin-left': 'margin-left',
  padding: 'padding',
  'padding-top': 'padding-top',
  'padding-right': 'padding-right',
  'padding-bottom': 'padding-bottom',
  'padding-left': 'padding-left',
  gap: 'gap',
  'row-gap': 'row-gap',
  'column-gap': 'column-gap',
  'font-size': 'font-size',
  'text-size': 'font-size',
  'line-height': 'line-height',
  'letter-spacing': 'letter-spacing',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
  inset: 'inset',
  'flex-basis': 'flex-basis',
  'grid-template-columns': 'grid-template-columns',
  'grid-template-rows': 'grid-template-rows',
  'border-radius': 'border-radius',
  'border-width': 'border-width',
  opacity: 'opacity',
  'z-index': 'z-index',
};

const registries = new WeakMap<Document, Map<string, RuntimeUtilityRegistry>>();

export function isValidCssLayerName(layer: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*$/.test(layer);
}

export function parseArbitraryUtilityClass(className: string): ArbitraryUtilityDeclaration | null {
  const valueStart = className.indexOf('-[');
  if (valueStart <= 0 || !className.endsWith(']')) {
    return null;
  }

  const utilityName = className.slice(0, valueStart);
  const property = utilityProperties[utilityName];
  if (!property) {
    return null;
  }

  const rawValue = className.slice(valueStart + 2, -1);
  if (!rawValue || /[;{}\u0000-\u001f\u007f]/.test(rawValue)) {
    return null;
  }

  const value = rawValue.replaceAll('_', ' ');
  if (/\b(?:url|image-set)\s*\(/i.test(value)) {
    return null;
  }

  return { className, property, value };
}

export class RuntimeUtilityRegistry {
  private readonly document: Document;

  private declarations = new Map<string, ArbitraryUtilityDeclaration>();

  private styleElement: HTMLStyleElement | null = null;

  public readonly layer: string | null;

  constructor(document: Document, layer?: string | null) {
    this.document = document;
    const normalizedLayer = layer?.trim() || null;
    if (normalizedLayer && !isValidCssLayerName(normalizedLayer)) {
      throw new Error(`Invalid CSS layer name: "${normalizedLayer}"`);
    }
    this.layer = normalizedLayer;
  }

  public register(className: string): boolean {
    if (this.declarations.has(className)) {
      return false;
    }

    const declaration = parseArbitraryUtilityClass(className);
    if (!declaration || !this.supports(declaration.property, declaration.value)) {
      return false;
    }

    this.declarations.set(className, declaration);
    this.render();
    return true;
  }

  private supports(property: string, value: string): boolean {
    const css = this.document.defaultView?.CSS;
    if (css && typeof css.supports === 'function') {
      return css.supports(property, value);
    }

    const probe = this.document.createElement('span').style;
    probe.setProperty(property, value);
    return probe.getPropertyValue(property) !== '';
  }

  private render() {
    if (!this.styleElement) {
      this.styleElement = this.document.createElement('style');
      this.styleElement.setAttribute('data-trunkjs-responsive-utilities', '');
      if (this.layer) {
        this.styleElement.setAttribute('data-layer', this.layer);
      }
      this.document.head.appendChild(this.styleElement);
    }

    const rules = Array.from(this.declarations.values()).map(
      ({ className, property, value }) => `[class~="${escapeCssString(className)}"] { ${property}: ${value}; }`,
    );

    this.styleElement.textContent = this.layer
      ? `@layer ${this.layer} {\n  ${rules.join('\n  ')}\n}`
      : rules.join('\n');
  }
}

export function registerElementArbitraryUtilities(
  element: HTMLElement,
  layer: string | null | undefined,
  logger: UtilityLogger,
): number {
  const classValue = element.getAttribute('class') || '';
  if (!classValue.includes('[')) {
    return 0;
  }

  let registry: RuntimeUtilityRegistry;
  try {
    registry = getRegistry(element.ownerDocument, layer);
  } catch (error) {
    logger.warn(error instanceof Error ? error.message : String(error));
    return 0;
  }

  let registered = 0;
  for (const token of classValue.split(/\s+/)) {
    if (!token.includes('[')) {
      continue;
    }
    for (const className of getClassNamesFromToken(token)) {
      if (registry.register(className)) {
        registered++;
      }
    }
  }
  return registered;
}

function getRegistry(document: Document, layer?: string | null): RuntimeUtilityRegistry {
  const normalizedLayer = layer?.trim() || '';
  if (normalizedLayer && !isValidCssLayerName(normalizedLayer)) {
    throw new Error(`Invalid CSS layer name: "${normalizedLayer}"`);
  }

  let documentRegistries = registries.get(document);
  if (!documentRegistries) {
    documentRegistries = new Map();
    registries.set(document, documentRegistries);
  }

  let registry = documentRegistries.get(normalizedLayer);
  if (!registry) {
    registry = new RuntimeUtilityRegistry(document, normalizedLayer);
    documentRegistries.set(normalizedLayer, registry);
  }
  return registry;
}

function escapeCssString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\a ');
}
