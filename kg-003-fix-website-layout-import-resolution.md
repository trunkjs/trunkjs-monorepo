---
slugName: fix-website-layout-import-resolution
includeFiles:
    - ./tsconfig.base.json
    - ./demo/website-layout/tsconfig.json
    - ./demo/website-layout/tsconfig.lib.json
    - ./demo/website-layout/vite.config.ts
    - ./demo/website-layout/package.json
    - ./packages/content-pane/package.json
    - ./packages/markdown-loader/package.json
    - ./packages/responsive/package.json
    - ./nx.json
    - ./package.json
editFiles:
    - ./tsconfig.base.json
    - ./demo/website-layout/tsconfig.json
    - ./demo/website-layout/package.json
    - ./demo/website-layout/src/index.ts
original_prompt: Why is demo/website-layout errornuous dont find the imports
---

# Prepare Fix import resolution for demo/website-layout

Make imports resolve correctly for the demo/website-layout package when building/serving with Vite/Nx. Currently “cannot find module …” occurs due to missing source entry, path alias gaps, and a module format mismatch.

## Assumptions

- Errors are of the form “Cannot find module '@trunkjs/website-layout'” or similar alias-based imports when building or serving with Vite/Nx.
- The demo/website-layout project is intended to be consumed via the TS path alias "@trunkjs/website-layout" from other workspace packages, and it may itself import local workspace packages like @trunkjs/content-pane, @trunkjs/responsive, @trunkjs/markdown-loader.
- The source entry for the website-layout package is expected at demo/website-layout/src/index.ts as per tsconfig.base.json, but the file does not exist yet.
- Consumers may also use deep imports (e.g., @trunkjs/website-layout/something), so a wildcard alias is helpful.

If these assumptions are not correct, please provide:

- A sample failing import statement and the exact error output
- Whether website-layout is supposed to be importable by others or only built/served standalone
- Any expected public API surface for website-layout

## Tasks

- Add wildcard path alias mapping for website-layout in tsconfig.base.json to enable deep imports
- Align website-layout TS module format to ESNext to match Vite expectations
- Declare workspace dependencies used by website-layout to ensure Node/Vite resolution
- Create demo/website-layout/src/index.ts as the package entry to satisfy alias resolution

## Overview: File changes

- tsconfig.base.json Add "@trunkjs/website-layout/\*" path mapping alongside existing alias
- demo/website-layout/tsconfig.json Use module "esnext" (remove CJS mismatch)
- demo/website-layout/package.json Add workspace dependencies for local packages
- demo/website-layout/src/index.ts Create source entry file and re-export intended public API

## Detail changes

### tsconfig.base.json

Referenced Tasks

- Add wildcard path alias mapping for website-layout Provide deep import compatibility by mapping "@trunkjs/website-layout/_" to "demo/website-layout/src/_"

Insert the wildcard mapping next to the existing "@trunkjs/website-layout" path:

Replace

```
"paths": {
  "@trunkjs/ast-markdown": ["packages/ast-markdown/src/index.ts"],
  "@trunkjs/browser-utils": ["packages/browser-utils/src/index.ts"],
  "@trunkjs/content-pane": ["packages/content-pane/src/index.ts"],
  "@trunkjs/dira": ["experimental/dira/src/index.ts"],
  "@trunkjs/markdown-loader": ["packages/markdown-loader/src/index.ts"],
  "@trunkjs/responsive": ["packages/responsive/src/index.ts"],
  "@trunkjs/template": ["experimental/template/src/index.ts"],
  "@trunkjs/website-layout": ["demo/website-layout/src/index.ts"]
}
```

by

```
"paths": {
  "@trunkjs/ast-markdown": ["packages/ast-markdown/src/index.ts"],
  "@trunkjs/browser-utils": ["packages/browser-utils/src/index.ts"],
  "@trunkjs/content-pane": ["packages/content-pane/src/index.ts"],
  "@trunkjs/dira": ["experimental/dira/src/index.ts"],
  "@trunkjs/markdown-loader": ["packages/markdown-loader/src/index.ts"],
  "@trunkjs/responsive": ["packages/responsive/src/index.ts"],
  "@trunkjs/template": ["experimental/template/src/index.ts"],
  "@trunkjs/website-layout": ["demo/website-layout/src/index.ts"],
  "@trunkjs/website-layout/*": ["demo/website-layout/src/*"]
}
```

### demo/website-layout/tsconfig.json

Referenced Tasks

- Align website-layout TS module format to ESNext Remove CJS override to avoid ESM/CJS mismatch under Vite

Update the compilerOptions.module to "esnext" (or remove it to inherit from the workspace base which is already esnext). The simplest is to explicitly set it to esnext to be unambiguous.

Replace

```
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "importHelpers": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    }
  ]
}
```

by

```
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "esnext",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "importHelpers": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    }
  ]
}
```

### demo/website-layout/package.json

Referenced Tasks

- Declare workspace dependencies used by website-layout Ensure resolution of local packages via workspaces

Add internal workspace dependencies you import from website-layout (adjust the list if different in your code). This ensures proper resolution for development and when bundling.

Replace

```
{
  "name": "@trunkjs/website-layout",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./index.js",
  "types": "./index.d.ts",
  "dependencies": {}
}
```

by

```
{
  "name": "@trunkjs/website-layout",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./index.js",
  "types": "./index.d.ts",
  "dependencies": {
    "@trunkjs/content-pane": "workspace:*",
    "@trunkjs/markdown-loader": "workspace:*",
    "@trunkjs/responsive": "workspace:*"
  }
}
```

If website-layout uses other internal packages, add them similarly with "workspace:\*".

### demo/website-layout/src/index.ts

Referenced Tasks

- Create source entry file and re-export intended public API Provide the module that the path alias points to

Create the entry file (if it doesn’t exist). Adjust exports to match your intended API.

New file: demo/website-layout/src/index.ts

```
/**
 * @package @trunkjs/website-layout
 * Entry point for the website layout demo library.
 * Export the public API you want consumers to import.
 */

// Re-export helpful pieces from sibling workspace libs if desired
export * from "@trunkjs/content-pane";
export * from "@trunkjs/markdown-loader";
export * from "@trunkjs/responsive";

// Example: export a layout API surface (customize/remove as needed)
export type LayoutConfig = {
  regions?: string[];
};

export function defineLayout(config: LayoutConfig = {}) {
  const regions = config.regions ?? ["header", "main", "footer"];
  return {
    regions,
    toString() {
      return `[WebsiteLayout regions=${regions.join(",")}]`;
    },
  };
}
```

Notes:

- If you don’t want to re-export other packages, remove those export lines and replace with your actual symbols/components.

## After changes

- Path aliases will resolve:
    - @trunkjs/website-layout -> demo/website-layout/src/index.ts
    - @trunkjs/website-layout/_ -> demo/website-layout/src/_
- Vite (ESM) and TypeScript module target are aligned (esnext), preventing CJS/ESM mismatches that can cause “cannot find module” or odd resolution behavior.
- The entry file exists and exports a public API, so consuming packages won’t fail to resolve.

Run:

- npx nx build website-layout
- Or serve/dev as you usually do: npx nx dev website-layout

## Example prompts to improve the original request

- When building website-layout, I get “Cannot find module '@trunkjs/website-layout' from packages/foo/src/...”. Here is the exact stack trace: …
- The import that fails is: import { X } from '@trunkjs/website-layout/something'; What should my path alias and file structure be?
- Should website-layout re-export @trunkjs/content-pane and @trunkjs/responsive, or should it only expose its own components? Here is my desired public API: …
