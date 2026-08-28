/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import * as path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { tjDemoViewerPlugin } from '../vite-demo-viewer/src/lib/tjDemoViewerPlugin.ts';

function standaloneDemoViewerPlugin() {
  return {
    ...tjDemoViewerPlugin({
      include: ['demo/**/*.demo.ts'],
      route: '/__tdemo',
    }),
    apply: 'serve' as const,
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
  cacheDir: '../../node_modules/.vite/packages/form',
  plugins: [
    standaloneDemoViewerPlugin(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
      aliasesExclude: [/@trunkjs\/.*/],
    }),
  ],
  build: {
    outDir: '../../dist/packages/form',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: 'src/index.ts',
      name: 'form',
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
    environment: 'node',
    include: [],
    passWithNoTests: true,
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/form',
      provider: 'v8' as const,
    },
  },
}));
