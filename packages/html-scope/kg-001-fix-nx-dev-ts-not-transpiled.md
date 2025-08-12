---
slugName: fix-nx-dev-ts-not-transpiled
includeFiles:
- ./src/components/tj-html-scope/t-html-scope.ts
- ./src/index.ts
- ./vite.config.ts
- ./tsconfig.json
- ./tsconfig.lib.json
- ./project.json
- ./index.html
editFiles:
- ./src/components/tj-html-scope/tj-html-scope.ts
- ./tsconfig.json
- ./vite.config.ts
- ./project.json
original_prompt: Die datei gj-html-scope.ts wird in nx dev nicht transpiled und im
  original ausgegeben. reparier das
---
# Prepare Fix: TS file not transpiled in Nx/Vite dev

The component file is served untranspiled during nx dev. We will:
- Fix TypeScript config for Vite (ESNext modules, decorators).
- Replace unsupported TypeScript “accessor” fields.
- Prevent deep TS imports from node_modules (or configure Vite to prebundle them).
- Add an Nx Vite dev target to run the dev server reliably.

## Assumptions

- “gj-html-scope.ts” refers to src/components/tj-html-scope/tj-html-scope.ts.
- @trunkjs/template exports scopeDefine, ScopeDefinition, and Template from its package entry. If not, see “Missing Information”.
- You run the app via Nx Vite dev (e.g., nx serve html-scope) rather than opening index.html directly.

## Missing Information

- Confirm whether @trunkjs/template publicly exports scopeDefine and ScopeDefinition. If not, we need either:
  - to add proper exports in that package, or
  - to set Vite optimizeDeps to prebundle the deep TS import path.

Example clarification prompt:
- Does @trunkjs/template export scopeDefine and ScopeDefinition from its main entry? If not, should we adjust that package, or should we prebundle a deep import in Vite dev?

## Tasks

- update-tsconfig-for-vite Use ESNext modules, enable legacy decorators, and set class fields for Lit
- remove-accessor-fields Replace TS “accessor” fields with standard properties to ensure esbuild transpiles
- fix-imports-or-prebundle Avoid deep TS imports from node_modules or configure Vite to prebundle them
- add-nx-serve-target Add a Vite dev target to project.json for consistent nx dev behavior

## Overview: File changes

- src/components/tj-html-scope/tj-html-scope.ts Replace accessor fields; fix imports to package entry
- tsconfig.json Use ESNext modules, enable experimentalDecorators, set useDefineForClassFields=false
- vite.config.ts Ensure decorators compile; optionally prebundle deep TS import if needed
- project.json Add serve target using @nx/vite:dev

## Detail changes

### src/components/tj-html-scope/tj-html-scope.ts

Referenced Tasks
- remove-accessor-fields Replace “public accessor …” with standard class fields
- fix-imports-or-prebundle Import from package entry to avoid raw TS from node_modules

Replace the import lines:

```
import { scopeDefine, ScopeDefinition } from '@trunkjs/template/src/lib/scopeDefine';
import { Template } from '@trunkjs/template';
```

by

```
import { scopeDefine, ScopeDefinition, Template } from '@trunkjs/template';
```

Replace “accessor” fields (esbuild may not downlevel them) and ensure compatibility with Lit decorators:

Replace

```
  @property({ type: String, reflect: true, attribute: "update-on"})
  public accessor updateOn  = 'change';

  public accessor $scope : ScopeDefinition;
```

by

```
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn: string = 'change';

  public $scope!: ScopeDefinition;
```

Optionally, to be explicit, initialize $scope in the constructor (kept as-is, but ensure type is set without accessor):

Keep/ensure in constructor:

```
  constructor() {
    super();
    this.$scope = scopeDefine({});
  }
```

Full updated file for clarity:

```
import { ReactiveElement } from 'lit';
import { create_element, LoggingMixin } from '@trunkjs/browser-utils';
import { property } from 'lit/decorators.js';
import { customElement } from 'lit/decorators.js';
import { scopeDefine, ScopeDefinition, Template } from '@trunkjs/template';

const templateRenderInElement: WeakMap<HTMLTemplateElement, HTMLElement> = new WeakMap();
const templateClass: WeakMap<HTMLTemplateElement, Template> = new WeakMap();

@customElement('tj-html-scope')
export class TjHtmlScope extends LoggingMixin(ReactiveElement) {
  @property({ type: String, reflect: true, attribute: 'update-on' })
  public updateOn: string = 'change';

  public $scope!: ScopeDefinition;

  constructor() {
    super();
    this.$scope = scopeDefine({});
  }

  private _renderTemplates() {
    for (const template of Array.from(this.querySelectorAll('template'))) {
      if (!templateRenderInElement.has(template)) {
        // Create a new Element below template
        const rendersInElment = create_element('div', { style: 'display: contents' });
        templateRenderInElement.set(template, rendersInElment);
        template.parentElement?.insertBefore(rendersInElment, template);
        templateClass.set(template, new Template(template.innerHTML, this.$scope));
      }

      // Render the template in the element
      templateClass.get(template)?.renderInElement(templateRenderInElement.get(template) as HTMLElement);
    }
  }

  private _updateScope() {
    for (const input of Array.from(this.querySelectorAll('[name]'))) {
      const name = input.getAttribute('name');
      if (name) {
        // @ts-expect-error: dynamic scope assignment
        this.$scope[name] = (input as HTMLInputElement).value;
      }
    }
  }

  override updated() {
    this.addEventListener(this.updateOn, () => {
      this._updateScope();
      this._renderTemplates();
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tj-html-scope': TjHtmlScope;
  }

  interface TjHtmlScope extends HTMLElement {
    debug?: boolean;
  }

  interface Window {
    TjHtmlScope: typeof TjHtmlScope;
  }

  interface HTMLElementEventMap {
    'scope-update': CustomEvent<void>;
  }

  interface ElementEventMap {
    'scope-update': CustomEvent<void>;
  }
}
```

### tsconfig.json

Referenced Tasks
- update-tsconfig-for-vite Enable ESNext modules and decorators for Vite and Lit

Replace the entire file content with:

```
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": false,

    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "importHelpers": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "files": [],
  "include": [],
  "references": [
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

Notes:
- ESNext modules + bundler resolution fit Vite dev/bundle.
- useDefineForClassFields=false recommended for Lit’s legacy decorators.

### vite.config.ts

Referenced Tasks
- fix-imports-or-prebundle Ensure decorators and potential deep imports are handled in dev

Add esbuild tsconfigRaw to ensure decorators are always respected in dev. Also optionally prebundle a deep import if you cannot change the import in the component.

Insert into the exported config object (top-level, alongside server, root, plugins, etc.):

```
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false
      }
    }
  },
```

If you cannot change the deep import (only if keeping `@trunkjs/template/src/lib/scopeDefine`), add optimizeDeps to prebundle it:

```
  optimizeDeps: {
    include: ['@trunkjs/template/src/lib/scopeDefine']
  },
```

Full updated file:

```
/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import * as path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(() => ({
  server: {
    port: 4000,
    host: '0.0.0.0',
    hmr: true
  },

  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/html-scope',
  plugins: [
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md', 'web-types.json']),
    dts({ entryRoot: 'src', tsconfigPath: path.join(__dirname, 'tsconfig.lib.json') })
  ],

  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false
      }
    }
  },

  // Uncomment this if deep TS import from @trunkjs/template must remain
  // optimizeDeps: {
  //   include: ['@trunkjs/template/src/lib/scopeDefine']
  // },

  build: {
    outDir: '../../dist/packages/html-scope',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    lib: {
      entry: 'src/index.ts',
      name: 'html-scope',
      fileName: 'index',
      formats: ['es' as const]
    },
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id)
    }
  },
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/html-scope',
      provider: 'v8' as const
    }
  }
}));
```

### project.json

Referenced Tasks
- add-nx-serve-target Add Vite dev target so `nx serve html-scope` works

Add a serve target. Insert this sibling to “build”:

```
    "serve": {
      "executor": "@nx/vite:dev",
      "defaultConfiguration": "development",
      "options": {
        "port": 4000
      },
      "configurations": {
        "development": {
          "mode": "development"
        },
        "production": {
          "mode": "production"
        }
      }
    },
```

Resulting targets section (abridged):

```
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "outputPath": "dist/{projectRoot}"
      },
      "configurations": {
        "development": {
          "mode": "development"
        },
        "production": {
          "mode": "production"
        }
      }
    },
    "serve": {
      "executor": "@nx/vite:dev",
      "defaultConfiguration": "development",
      "options": {
        "port": 4000
      },
      "configurations": {
        "development": {
          "mode": "development"
        },
        "production": {
          "mode": "production"
        }
      }
    },
    "nx-release-publish": {
      "executor": "@nx/js:release-publish",
      "options": {
        "packageRoot": "dist/{projectRoot}"
      }
    }
  }
```

## Notes and verification

- Run: nx serve html-scope
- Open: http://localhost:4000
- The file should now be transpiled (no “accessor” or TS syntax reaches the browser).
- If you still see untranspiled TS from @trunkjs/template deep import, either:
  - switch to package entry import (preferred), or
  - enable optimizeDeps.include as shown above.