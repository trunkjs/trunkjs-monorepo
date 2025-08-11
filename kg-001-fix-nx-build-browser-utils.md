---
slugName: fix-nx-build-browser-utils
includeFiles:
    - packages/browser-utils/project.json
    - packages/browser-utils/vite.config.ts
    - nx.json
    - package.json
editFiles:
    - packages/browser-utils/project.json
original_prompt: Fix the build problem in nx build browser-utils
---

# Prepare Fix the build problem in `nx build browser-utils`

Define a proper Nx build target for the browser-utils package using Vite so that running `nx build browser-utils` succeeds and produces the expected output.

## Assumptions

- The current failure is “Target 'build' not found for project 'browser-utils'” (or equivalent), because the project has no build target configured.
- Vite is the intended build tool for libraries (there is a valid `vite.config.ts` per package).
- We should keep the Vite `build.outDir` as the canonical output path; Nx `options.outputPath` should match it for correct caching and artifact tracking.
- No other project’s build needs to be fixed in this task; the focus is only on `browser-utils`.

## Tasks

- Add Nx Vite build target Add a build target using @nx/vite:build with outputPath aligned to vite.config.ts outDir.
- Preserve existing targets Keep the existing nx-release-publish target unchanged.

## Overview: File changes

- packages/browser-utils/project.json Add a Vite build target ("build") with outputPath set to dist/packages/browser-utils.

## Detail changes

### packages/browser-utils/project.json

Referenced Tasks

- Add Nx Vite build target Define a "build" target using @nx/vite:build with aligned paths.

Replace the entire content of packages/browser-utils/project.json with:

```
{
  "name": "browser-utils",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/browser-utils/src",
  "projectType": "library",
  "tags": [],
  "// targets": "to see all targets run: nx show project browser-utils --web",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "outputPath": "dist/packages/browser-utils"
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
  },
  "release": {
    "version": {
      "currentVersionResolver": "disk",
      "preserveLocalDependencyProtocols": false,
      "manifestRootsToUpdate": ["{projectRoot}"]
    }
  }
}
```

Notes:

- The outputPath matches the Vite configuration’s outDir (../../dist/packages/browser-utils), resolving relative to workspace root as "dist/packages/browser-utils".
- No changes to vite.config.ts are necessary.

## Verification

- Run:
    - npx nx build browser-utils
- Expected:
    - Vite builds the library using packages/browser-utils/vite.config.ts
    - Output artifacts in dist/packages/browser-utils
    - Nx target completes successfully with cacheable output

## Example follow-up prompts

- The build still fails; here’s the full error output from npx nx build browser-utils: <paste logs>. What should I change?
- Add similar build targets to all packages under packages/\* so npx nx run-many -t build succeeds.
- Switch build target to TypeScript-only using @nx/js:tsc and generate type declarations only for browser-utils.
