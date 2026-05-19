import fg from 'fast-glob';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

export type TViteDemoExporterOptions = {
  include?: string[];
  title?: string;
};

function normalizeImportPath(value: string) {
  const normalized = value.split(path.sep).join('/');
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

function toImportPath(fromDir: string, toFile: string) {
  return normalizeImportPath(path.relative(fromDir, toFile));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// @ts-expect-error TS1343: import.meta is supported by Vite at runtime for this module.
const viewerComponentPath = fileURLToPath(new URL('../components/tj-demo-viewer/tj-demo-viewer.ts', import.meta.url));
// @ts-expect-error TS1343: import.meta is supported by Vite at runtime for this module.
const rendererComponentPath = fileURLToPath(
  new URL('../components/tj-demo-renderer/tj-demo-renderer.ts', import.meta.url),
);

export class viteDemoExporter {
  readonly outDir: string;
  readonly include: string[];
  readonly title: string;

  constructor(outDir: string, options: TViteDemoExporterOptions = {}) {
    this.outDir = path.resolve(process.cwd(), outDir);
    this.include = options.include ?? ['**/*.demo.ts'];
    this.title = options.title ?? 'TDemo Viewer';
  }

  async build() {
    const demoFiles = await this.#scanDemos();
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'vite-demo-exporter-'));

    try {
      await writeFile(path.join(tempDir, 'index.html'), this.#createIndexHtml(), 'utf8');
      await writeFile(path.join(tempDir, 'index.ts'), this.#createClientSource(tempDir, demoFiles), 'utf8');

      await build({
        configFile: false,
        publicDir: false,
        root: tempDir,
        build: {
          outDir: this.outDir,
          emptyOutDir: true,
          cssCodeSplit: false,
          assetsInlineLimit: 0,
          rollupOptions: {
            input: path.join(tempDir, 'index.html'),
            output: {
              entryFileNames: 'index.js',
              chunkFileNames: 'chunks/[name]-[hash].js',
              assetFileNames: (assetInfo) => {
                const name = assetInfo.name ?? '';
                if (name.endsWith('.css')) {
                  return 'index.css';
                }

                return 'assets/[name]-[hash][extname]';
              },
            },
          },
        },
      });

      return {
        outDir: this.outDir,
        demoFiles,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  async #scanDemos() {
    return fg(this.include, {
      cwd: process.cwd(),
      absolute: false,
      onlyFiles: true,
    });
  }

  #createIndexHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(this.title)}</title>
  </head>
  <body>
    <tj-demo-viewer id="tj-demo-viewer"></tj-demo-viewer>
    <tj-demo-renderer></tj-demo-renderer>
    <script type="module" src="./index.ts"></script>
  </body>
</html>
`;
  }

  #createClientSource(tempDir: string, demoFiles: string[]) {
    const imports = [
      `import ${JSON.stringify(toImportPath(tempDir, viewerComponentPath))};`,
      `import ${JSON.stringify(toImportPath(tempDir, rendererComponentPath))};`,
      ...demoFiles.map((file, index) => {
        const absoluteFile = path.resolve(process.cwd(), file);
        return `import * as demoModule${index} from ${JSON.stringify(toImportPath(tempDir, absoluteFile))};`;
      }),
    ].join('\n');

    const demos = demoFiles.length
      ? demoFiles
          .map((file, index) => `normalizeDemoDefinition(${JSON.stringify(file)}, demoModule${index})`)
          .join(',\n  ')
      : '';

    return `${imports}

function normalizeDemoDefinition(filename, mod) {
  const definition = mod.default ?? mod;
  const baseDefinition = typeof definition === 'object' && definition !== null ? definition : {};
  const render =
    typeof baseDefinition.render === 'function'
      ? baseDefinition.render
      : typeof mod.render === 'function'
        ? mod.render
        : undefined;

  return {
    ...baseDefinition,
    filename: baseDefinition.filename ?? filename,
    ...(render ? { render } : {}),
  };
}

const demos = [
  ${demos}
];

function applyDemos() {
  const viewer = document.querySelector('tj-demo-viewer');

  if (!viewer) {
    return false;
  }

  viewer.demos = demos;
  return true;
}

if (!applyDemos()) {
  window.addEventListener(
    'tj:viewerReady',
    () => {
      applyDemos();
    },
    { once: true },
  );
}
`;
  }
}
