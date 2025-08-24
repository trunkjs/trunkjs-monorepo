import { create_element, Logger } from '@trunkjs/browser-utils';

export type SrcReturn = {
  template: string;
  scope: object | null;
};

export async function loadExternalSrc(src: string, logger: Logger): Promise<SrcReturn> {
  const data = await fetch(src);
  if (!data.ok) {
    logger.throwError(`Failed to load content from ${src}: ${data.status} ${data.statusText}`);
  }
  const text = await data.text();
  const template = create_element('template') as HTMLTemplateElement;
  template.innerHTML = text;
  const content = template.content;
  const scopeScript = content.querySelector('script[scope]') as HTMLScriptElement | null;
  return {
    template: text,
    scope: JSON.parse(scopeScript?.textContent || 'null') || null,
  };
}
