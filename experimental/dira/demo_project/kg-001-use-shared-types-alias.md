---
slugName: use-shared-types-alias
includeFiles:
    - ./apps/web/src/demo-component1.ts
    - ./apps/web/tsconfig.json
    - ./packages/types/tsconfig.json
    - ./tsconfig.base.json
    - ./apps/web/vite.config.ts
editFiles:
    - ./apps/web/src/components/demo-component1.ts
    - ./apps/web/tsconfig.json
    - ./packages/types/tsconfig.json
    - ./tsconfig.base.json
original_prompt: Fix the project so that when importing from packages types it will
    use @shared/types instead of the relative path.
---

# Prepare Use @shared/types alias across project

Align TypeScript path aliases and imports so that all consumers import from @shared/types instead of relative paths. Ensure TypeScript and Vite resolve the alias consistently.

## Assumptions

- Monorepo layout:
    - packages/types contains the shared type definitions (index.ts).
    - apps/web consumes these types.
- Vite is used for the web app; its alias '@shared' → ../packages is already correct.
- We only need the types at compile-time; no runtime code is exported from @shared/types. We will use type-only imports to avoid runtime bundling issues.

## Tasks

- Update imports to use @shared/types and leverage type-only imports
- Fix TypeScript path mappings in apps/web
- Clean up incorrect paths in packages/types tsconfig
- Align root tsconfig.base.json path mapping for consistency

## Overview: File changes

- ./apps/web/src/components/demo-component1.ts Replace relative import with type-only import from @shared/types
- ./apps/web/tsconfig.json Fix paths to resolve @shared/_ to ../../packages/_
- ./packages/types/tsconfig.json Remove incorrect paths mapping
- ./tsconfig.base.json Update paths to resolve @shared/_ to packages/_

## Detail changes

### ./apps/web/src/components/demo-component1.ts

Referenced Tasks

- Update imports to use @shared/types and leverage type-only imports Replace relative import with alias
- Fix TypeScript path mappings in apps/web Ensure TypeScript resolves the alias correctly

Replace

```
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { html } from 'lit/static-html.js';
import { DemoType } from '../../../../../packages/types';

@customElement('demo-component1')
class DemoComponent1 extends LitElement{



  render() {
    const wrust : DemoType
    return html`<div>
      <h1>Demo Component 1</h1>
      <p>This is a demo compnt.</p>
      <slot></slot>
    </div>`;
  }
}
```

by

```
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { html } from 'lit/static-html.js';
import type { DemoType } from '@shared/types';

@customElement('demo-component1')
class DemoComponent1 extends LitElement {
  render() {
    const wrust: DemoType
    return html`<div>
      <h1>Demo Component 1</h1>
      <p>This is a demo compnt.</p>
      <slot></slot>
    </div>`;
  }
}
```

Notes:

- Use `import type` to ensure the import is erased at runtime.

### ./apps/web/tsconfig.json

Referenced Tasks

- Fix TypeScript path mappings in apps/web Configure @shared/\* to point to the monorepo packages folder

Replace entire file content with:

```
{
  "compilerOptions": {
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../../packages/*"]
    }
  }
}
```

Notes:

- This allows `@shared/types` to resolve to `../../packages/types` from the web app.

### ./packages/types/tsconfig.json

Referenced Tasks

- Clean up incorrect paths in packages/types tsconfig Remove invalid/irrelevant path mapping

Replace entire file content with:

```
{
  "compilerOptions": {
    "composite": true,
    "baseUrl": "."
  }
}
```

Notes:

- The previous paths entry referenced `packages/shared/*` which does not exist. This package doesn’t need a paths mapping for itself.

### ./tsconfig.base.json

Referenced Tasks

- Align root tsconfig.base.json path mapping for consistency Provide a consistent alias across the monorepo

Replace entire file content with:

```
{
  "compilerOptions": {
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["packages/*"]
    }
  }
}
```

Notes:

- This provides a consistent alias at the repo root. Individual apps can still override as needed.

### No change required: ./apps/web/vite.config.ts

- Current alias is correct:
    - '@shared': path.resolve(\_\_dirname, '../packages')
- With the TS changes above, both Vite and TS will resolve '@shared/types' consistently.

## Example prompts to improve the original request

- “We use Vite and TypeScript in a monorepo (apps/web and packages/types). Configure TS path aliases so apps import types via @shared/types and update existing imports accordingly.”
- “Ensure @shared/\* resolves to the monorepo packages directory for both TypeScript and Vite. Update any code importing types via relative paths to use @shared/types and prefer type-only imports.”
