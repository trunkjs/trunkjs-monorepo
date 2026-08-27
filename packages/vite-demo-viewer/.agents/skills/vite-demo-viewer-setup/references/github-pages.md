# Combined Docs Viewer and GitHub Pages

Use a dedicated `docs` Vite project to serve or build all package demos together. It owns no handwritten `index.html`; `@trunkjs/vite-demo-viewer` generates the HTML entry during the static build.

Expected layout:

```text
docs/
├── project.json
└── vite.config.ts
packages/
└── */demo/**/*.demo.ts
```

## `docs/vite.config.ts`

```ts
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { tjDemoViewerPlugin } from '@trunkjs/vite-demo-viewer';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../node_modules/.vite/docs',

  // Local default: '/'. GitHub Actions supplies '/<repository>/'.
  base: process.env.VITE_BASE ?? '/',

  plugins: [
    tjDemoViewerPlugin({
      root: '..',
      include: ['packages/*/demo/**/*.demo.ts'],
      route: '/',
      title: 'Component demos',
      build: true,
    }),
    nxViteTsPaths(),
  ],

  server: {
    host: '0.0.0.0',
    port: 4200,
    strictPort: true,
  },

  build: {
    outDir: '../dist/docs',
    emptyOutDir: true,
  },
});
```

Tag filters apply in both serve and build mode:

```ts
tjDemoViewerPlugin({
  includeTags: ['public', 'showcase'],
  excludeTags: ['dev'],
  build: true,
})
```

- Without `includeTags` or `excludeTags`, every discovered demo is available.
- `includeTags` keeps demos that have at least one listed tag.
- `excludeTags` removes demos that have any listed tag and takes precedence over `includeTags`.
- Filtered demos are absent from the registry, navigation, and direct hash lookup.

For local development, normally omit both filters so private and work-in-progress demos remain available. Configure the filters on the dedicated static viewer when only public demos should be exported.

The plugin scan root is the monorepo root, not the `docs` directory. This keeps generated demo filenames stable, for example:

```text
packages/button/demo/default.demo.ts
```

The resulting navigation remains hash-based:

```text
https://trunkjs.github.io/example-repository/#/demo/packages%2Fbutton%2Fdemo%2Fdefault.demo.ts
```

Everything after `#` stays in the browser. GitHub Pages only requests `/example-repository/`, so refreshing a demo does not require a rewrite or custom `404.html`.

## `docs/project.json`

```json
{
  "name": "docs",
  "$schema": "../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "docs",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/docs"
      }
    }
  }
}
```

With the root `@nx/vite/plugin` configuration, Nx infers the development target:

```bash
npx nx serve docs
npx nx build docs
```

The build artifact must contain `index.html` at the top level of `dist/docs`.

## `.github/workflows/docs-pages.yml`

```yaml
name: Docs Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Build combined demo viewer
        run: npx nx build docs
        env:
          VITE_BASE: /${{ github.event.repository.name }}/

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/docs

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

For a project page hosted at `https://<owner>.github.io/<repository>/`, keep `VITE_BASE` as `/<repository>/`. For an organization/user root page or a custom domain that serves the viewer at the domain root, set it to `/` instead.

Do not copy the built files into the repository's source `docs` directory when deployment uses `upload-pages-artifact`; deploy `dist/docs` directly.
