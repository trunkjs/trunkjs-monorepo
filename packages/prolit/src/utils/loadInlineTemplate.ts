import { Logger } from '@trunkjs/browser-utils';
import { SrcReturn } from './load-external-src';

export function loadInlineTemplate(rootElement: HTMLElement, loggger: Logger): SrcReturn {
  let templateElement = rootElement.querySelector('template');
  if (!templateElement) {
    loggger.log('No <template> element found inside the provided root element. Wrapping content into template');
    templateElement = document.createElement('template');
    templateElement.innerHTML = rootElement.innerHTML;
    // Remove all but last child node
    rootElement.innerHTML = '';
    rootElement.appendChild(templateElement);
  }

  const scopeScript = templateElement.content.querySelector('script[scope]') as HTMLScriptElement | null;
  loggger.log('Found scope script:', scopeScript);

  const scope = scopeScript?.textContent ? JSON.parse(scopeScript.textContent) : null;
  if (scopeScript) {
    templateElement.content.removeChild(scopeScript);
  }
  return {
    template: templateElement.innerHTML,
    scope,
  };
}
