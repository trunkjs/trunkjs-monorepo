import { Logger } from '@trunkjs/browser-utils';

export async function evalImportSrc(template: HTMLTemplateElement, logger: Logger): Promise<HTMLTemplateElement> {
  for (const include of Array.from(template.content.querySelectorAll('[import-src]'))) {
    logger.log('Processing [import-src] element', include);
    const src = include.getAttribute('import-src');
    if (!src) {
      logger.throwError('import element is missing the src attribute', include);
    }
    const content = await fetch(src);
    if (!content.ok) {
      logger.throwError(`Failed to load content from ${src}: ${content.status} ${content.statusText}`, include);
    }
    include.innerHTML = await content.text();
  }
  return template;
}
