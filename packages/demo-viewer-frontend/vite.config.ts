/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

const mockHtml = readFileSync(fileURLToPath(new URL('./index.html', import.meta.url)), 'utf8');
const mockClient = readFileSync(fileURLToPath(new URL('./src/mock/tjDemoViewerClient.js', import.meta.url)), 'utf8');

function demoViewerFrontendMockPlugin(): Plugin {
  const include = ['demo/**/*.demo.ts'];
  const route = '/__tdemo';
  const virtualRegistryId = 'virtual:tdemo-registry';
  const resolvedRegistryId = '\0' + virtualRegistryId;

  let demoFiles: string[] = [];

  async function scanDemos() {
    demoFiles = await fg(include, {
      cwd: __dirname,
      absolute: false,
    });
  }

  function generateRegistry() {
    return `
      ${demoFiles.map((file, index) => `import * as demoModule${index} from ${JSON.stringify('/' + file)}`).join('\n')}

      function normalizeDemoDefinition(filename, mod) {
        const definition = mod.default ?? mod
        const baseDefinition = typeof definition === "object" && definition !== null ? definition : {}
        const render =
          typeof baseDefinition.render === "function"
            ? baseDefinition.render
            : typeof mod.render === "function"
              ? mod.render
              : undefined

        return {
          ...baseDefinition,
          filename: baseDefinition.filename ?? filename,
          ...(render ? { render } : {}),
        }
      }

      export const demos = [
        ${demoFiles.map((file, index) => `normalizeDemoDefinition(${JSON.stringify(file)}, demoModule${index})`).join(',\n')}
      ]
    `;
  }

  return {
    name: 'demo-viewer-frontend-mock',
    apply: 'serve',

    async configureServer(server) {
      await scanDemos();

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0] ?? '';
        const isViewerRoute = pathname === '/' || pathname === '/index.html' || pathname.startsWith(route);

        if (!isViewerRoute) {
          return next();
        }

        await scanDemos();

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(mockHtml);
      });
    },

    resolveId(id) {
      if (id === virtualRegistryId) {
        return resolvedRegistryId;
      }

      if (id === '/@tdemo/client') {
        return id;
      }

      return undefined;
    },

    load(id) {
      if (id === resolvedRegistryId) {
        return generateRegistry();
      }

      if (id === '/@tdemo/client') {
        return mockClient;
      }

      return undefined;
    },

    async handleHotUpdate(ctx) {
      if (!ctx.file.endsWith('.demo.ts')) {
        return undefined;
      }

      await scanDemos();

      const mod = ctx.server.moduleGraph.getModuleById(resolvedRegistryId);
      if (mod) {
        ctx.server.moduleGraph.invalidateModule(mod);
      }

      ctx.server.ws.send({
        type: 'full-reload',
      });

      return [];
    },
  };
}

export default defineConfig(() => ({
  server: {
    port: 4000,
    host: '0.0.0.0',
    hmr: true,
    strictPort: true,
  },
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/demo-viewer-frontend',
  plugins: [
    demoViewerFrontendMockPlugin(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
      aliasesExclude: [/@trunkjs\/.*/],
    }),
  ],
  build: {
    outDir: '../../dist/packages/demo-viewer-frontend',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: 'src/index.ts',
      name: 'demo-viewer-frontend',
      fileName: 'index',
      formats: ['es' as const],
    },
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
    },
  },
  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/demo-viewer-frontend',
      provider: 'v8' as const,
    },
  },
}));
