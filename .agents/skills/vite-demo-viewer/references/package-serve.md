# Package Serve Configuration

Use this setup when developing the demos of one library package. The plugin's static build remains disabled, so the existing Vite library build is not replaced.

Expected package layout:

```text
packages/button/
├── demo/
│   └── default.demo.ts
├── src/
│   └── index.ts
├── index.ts
├── index.js
├── index.d.ts
├── project.json
└── vite.config.ts
```

The root `index.*` files stay available for direct development imports. Follow the repository's existing entry-file convention rather than moving them into `src`.

## `packages/button/vite.config.ts`

Add the viewer plugin to the package's existing Vite configuration. Preserve existing build, test, DTS, asset-copy, and alias plugins.

```ts
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { tjDemoViewerPlugin } from '@trunkjs/vite-demo-viewer';
import * as path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/button',

  plugins: [
    tjDemoViewerPlugin({
      include: ['demo/**/*.demo.ts'],
      route: '/',
      title: 'Button demos',
    }),
    nxViteTsPaths(),
  ],

  server: {
    host: '0.0.0.0',
    port: 4000,
    strictPort: true,
  },

  build: {
    outDir: '../../dist/packages/button',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
    },
  },
});
```

Important details:

- `route: '/'` makes the package server open the viewer directly.
- Omit `build: true`. The `build` block above remains the library build.
- If the package already uses another port or Vite plugins, keep them.
- Use a different route such as `/__tdemo` when the Vite server also hosts another application.

## `packages/button/project.json`

Keep the project configuration small. With `@nx/vite/plugin` configured in the root `nx.json`, Nx infers `serve`, `preview`, and related Vite targets from `vite.config.ts`.

```json
{
  "name": "button",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/button/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/packages/button"
      }
    }
  }
}
```

Run the viewer with:

```bash
npx nx serve button
```

Do not add a second explicit `serve` target unless the repository does not use Nx Vite target inference.
