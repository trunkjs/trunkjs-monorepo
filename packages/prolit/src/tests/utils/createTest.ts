import { create_element } from '@trunkjs/browser-utils';
import { ProLitTemplate, scopeDefine, ScopeDefinition } from '@trunkjs/prolit';

/**
 * Creates a test environment for ProLitTemplate.
 *
 * Attention: You cannot use innerHTML because Lit-html will add comments to the DOM.
 *
 * @example
 *
 * const { tpl, sc, e, render } = createTest(`<div>Hello, {{ name }}!</div>`, {
 *   name: 'World'
 * });
 * render();
 * console.log(e.querySelector("div").textContent); // Should log: <div>Hello, World!</div>
 *
 * @param template
 * @param scope
 */
export function createTest<T extends object>(
  template: string,
  scope: T,
): { tpl: ProLitTemplate; sc: ScopeDefinition & T; e: HTMLElement; render: () => void } {
  const sc = scopeDefine(scope);
  const e = create_element('div');
  const tpl = new ProLitTemplate(template, sc);
  sc.$tpl = tpl; // Set the template in the scope
  const render = () => tpl.renderInElement(e);
  return {
    tpl,
    sc,
    e,
    render,
  };
}
