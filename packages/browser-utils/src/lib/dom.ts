import { html, render } from 'lit';

/**
 * Rendert ein Lit-Template einmalig als frisches DOM-Fragment.
 * Beim Einfügen werden dessen Kinder verschoben; spätere Updates und eine
 * automatische Lifecycle-Verwaltung von Lit-Directives sind nicht vorgesehen.
 *
 * @example
 * ```ts
 * import { dom } from '@trunkjs/browser-utils';
 *
 * const label = 'Bearbeiten';
 * const fragment = dom`<button type="button"
 *   @click=${() => console.log('Bearbeiten angeklickt')}>${label}</button>`;
 * document.body.append(fragment);
 * // Die Kinder sind jetzt im Dokument; das Fragment ist leer.
 * ```
 */
export function dom(strings: TemplateStringsArray, ...values: unknown[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  render(html(strings, ...values), fragment);
  return fragment;
}
