import { html, render } from 'lit';

/**
 * Rendert ein Lit-Template einmalig als frisches DOM-Fragment.
 * Beim Einfügen werden dessen Kinder verschoben; spätere Updates und eine
 * automatische Lifecycle-Verwaltung von Lit-Directives sind nicht vorgesehen.
 */
export function dom(strings: TemplateStringsArray, ...values: unknown[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  render(html(strings, ...values), fragment);
  return fragment;
}
