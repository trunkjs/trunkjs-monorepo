---
slugName: fix-responsive-content-pane-build-targets
includeFiles:
    - packages/browser-utils/project.json
    - packages/responsive/project.json
    - packages/responsive/vite.config.ts
    - packages/content-pane/project.json
    - packages/content-pane/vite.config.ts
    - nx.json
editFiles:
    - packages/responsive/project.json
    - packages/content-pane/project.json
original_prompt: Fix responsive and content-pane builds like working browser-utils
---

# Prepare Fix responsive and content-pane builds like working browser-utils

Align the build setup for packages responsive and content-pane with the working configuration used by browser-utils. Add proper Nx Vite build targets and ensure release publish targets are runnable.

## Assumptions

- Nx and Vite plugin are installed and configured (see nx.json with @nx/vite/plugin).
- Library build artifacts should end up in dist/packages/<package-name>, as configured by each package’s vite.config.ts.
- The monorepo release flow (nx release) calls build prior to versioning (see nx.json release.version.preVersionCommand), so all packages must define a build target.
- We keep each package’s existing Vite and TypeScript settings; only project.json targets need fixing.

## Tasks

- add-build-target-content-pane Add @nx/vite:build target matching browser-utils
- fix-nx-release-publish-content-pane Add executor to nx-release-publish to make it runnable
- add-build-target-responsive Add @nx/vite:build target matching browser-utils
- add-nx-release-publish-responsive Add nx-release-publish target for responsive

## Overview: File changes

- packages/content-pane/project.json Add build target; fix nx-release-publish to include executor
- packages/responsive/project.json Add build target; add nx-release-publish target; keep schema and metadata

## Detail changes

### packages/content-pane/project.json

Referenced Tasks

- add-build-target-content-pane Add @nx/vite:build with outputs and configurations
- fix-nx-release-publish-content-pane Add executor @nx/js:release-publish

Replace the entire file content by

```
{
  "name": "content-pane",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/content-pane/src",
  "projectType": "library",
  "tags": [],
  "release": {
    "version": {
      "currentVersionResolver": "disk",
      "preserveLocalDependencyProtocols": false,
      "manifestRootsToUpdate": ["{projectRoot}"]
    }
  },
  "// targets": "to see all targets run: nx show project content-pane --web",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "outputPath": "dist/packages/content-pane"
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
}
```

Notes

- outputPath matches vite.config.ts build.outDir: ../../dist/packages/content-pane.
- Added executor for nx-release-publish so nx can run it.

### packages/responsive/project.json

Referenced Tasks

- add-build-target-responsive Add @nx/vite:build with outputs and configurations
- add-nx-release-publish-responsive Add publish target for parity with browser-utils

Replace the entire file content by

```
{
  "name": "responsive",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/responsive/src",
  "projectType": "library",
  "tags": [],
  "// targets": "to see all targets run: nx show project responsive --web",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "outputPath": "dist/packages/responsive"
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
}
```

Notes

- outputPath matches vite.config.ts build.outDir: ../../dist/packages/responsive.

## Validation

- Run: npx nx run responsive:build and npx nx run content-pane:build
- Verify outputs at dist/packages/responsive and dist/packages/content-pane.
- Optional: Run release pre-step to ensure both are built: npx nx run-many -t build

## Better request examples

- “Add Nx Vite build targets for packages responsive and content-pane identical to browser-utils (executor @nx/vite:build, outputPath dist/packages/<name>, dev/prod modes).”
- “Fix nx-release-publish targets for content-pane and responsive to use @nx/js:release-publish and packageRoot dist/{projectRoot}.”
