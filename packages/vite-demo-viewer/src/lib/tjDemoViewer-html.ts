export type TViewerHtmlOptions = {
  title: string;
  clientEntry: string;
};

export function generateViewerHtml(options: TViewerHtmlOptions): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
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
