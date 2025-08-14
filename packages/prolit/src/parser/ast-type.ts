export type AstHtmlElement = {
  type: 'element' | 'text' | 'other';
  tagName?: string; // only for 'element' type
  attributes?: Array<{ name: string; value?: string }>; // only for 'element' type
  children?: AstHtmlElement[]; // only for 'element' type
  textContent?: string; // only for 'text' type
  // Indicate node without content (e.g. <br>)
  isVoid?: boolean; // only for 'element' type
};
