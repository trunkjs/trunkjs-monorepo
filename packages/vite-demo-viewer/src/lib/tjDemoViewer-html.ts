export type TViewerHtmlOptions = {
  title: string;
  clientEntry: string;
  cssEntries?: readonly string[];
};

export function generateViewerHtml(options: TViewerHtmlOptions): string {
  const cssLinks = (options.cssEntries ?? [])
    .map((href) => `    <link rel="stylesheet" href="${escapeHtml(href)}" />`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>${cssLinks ? `\n${cssLinks}` : ''}
  </head>
  <body>
    <tj-demo-viewer id="tj-demo-viewer"></tj-demo-viewer>
    <tj-demo-renderer></tj-demo-renderer>
    <script type="module" src="${escapeHtml(options.clientEntry)}"></script>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
