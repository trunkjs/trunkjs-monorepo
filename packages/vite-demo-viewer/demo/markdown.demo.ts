import { defineDemo } from '../src/types';

export default defineDemo({
  title: 'Markdown Demo',
  description: 'Beispiel für statischen Markdown-Content im vite-demo-viewer.',
  markdown: `# Markdown im Demo-Viewer

Dieses Beispiel wird über **@trunkjs/ast-markdown** gerendert.

## Features

- Überschriften
- **Fetter Text**
- [Links](https://example.com)
- Listen

> Markdown kann direkt in einer ".demo.ts"-Datei hinterlegt werden.

\`\`\`ts
export default defineDemo({
  markdown: '# Hallo Welt'
});
\`\`\`
`,
});
