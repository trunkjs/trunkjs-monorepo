---
slugName: fix-nx-json-and-add-typecheck
includeFiles:
- ./nx.json
- ./demo/website-layout/project.json
editFiles:
- ./nx.json
- ./demo/website-layout/project.json
original_prompt: Die Datei ./nx.json ist doof
---
# Prepare Fix nx.json und Type-Check-Target ergänzen

iel: Inkonsistenzen in nx.json beseitigen (fehlerhafter Target-Name und unvollständiger preVersionCommand) und ein fehlendes Type-Check-Target in demo/website-layout hinzufügen, sodass Vite- und TS-Checks sauber zusammenarbeiten.

## Annahmen

- Nx-Version ist >= 19 und nutzt die neuen Plugin-/Release-Funktionen.
- Es ist gewünscht, dass beim Versionieren (nx release) alle Projekte gebaut werden.
- TypeScript-Types werden über Vite (vite-plugin-dts) erzeugt; der separate tsc-Lauf dient ausschließlich der Typprüfung (noEmit: true).

## Missing Information

- Welcher Paketmanager wird verwendet (npm, pnpm, yarn)? Für preVersionCommand wäre ggf. eine Anpassung sinnvoll (z. B. pnpm nx statt nx).
- Sollen beim preVersionCommand wirklich alle Projekte gebaut werden oder nur die betroffenen (–affected)?

## Tasks

- nx-json-typecheck-target-korrigieren Korrigiere den Typecheck-Target-Namen von "tsc:typecheck" auf "typecheck".
- nx-json-preversioncommand-fix Füge "--all" zum preVersionCommand hinzu, damit nx run-many ohne Fehler läuft.
- website-layout-typecheck-target-hinzufuegen Ergänze ein "typecheck"-Target mit @nx/js:tsc und noEmit: true.

## Overview: File changes

- ./nx.json Korrigiere Typecheck-Target-Namen und preVersionCommand; belasse übrige Konfigurationen.
- ./demo/website-layout/project.json Füge ein "typecheck"-Target hinzu, das @nx/js:tsc mit tsconfig.lib.json nutzt.

## Detail changes

### ./nx.json

Referenced Tasks
- nx-json-typecheck-target-korrigieren Vereinheitliche Target-Namen auf "typecheck", passend zum Vite-Plugin.
- nx-json-preversioncommand-fix Ergänze "--all" zu nx run-many, damit der Befehl ohne --projects/--all nicht fehlschlägt.

Ersetze die gesamte Datei durch:

```json
{
  "pluginsConfig": {
    "@nx/js": {
      "analyzeSourceFiles": true
    }
  },
  "extends": "nx/presets/npm.json",
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "release": {
    "projects": ["packages/*", "experimental/*"],
    "projectsRelationship": "independent",
    "changelog": {
      "automaticFromRef": true,
      "projectChangelogs": true
    },
    "version": {
      "preVersionCommand": "nx run-many -t build --all",
      "updateDependents": "never"
    }
  },
  "workspaceLayout": {
    "libsDir": "packages",
    "appsDir": "apps"
  },
  "plugins": [
    {
      "plugin": "@nx/vite/plugin",
      "options": {
        "buildTargetName": "build",
        "testTargetName": "test",
        "serveTargetName": "serve",
        "devTargetName": "dev",
        "previewTargetName": "preview",
        "serveStaticTargetName": "serve-static",
        "typecheckTargetName": "typecheck",
        "buildDepsTargetName": "build-deps",
        "watchDepsTargetName": "watch-deps"
      }
    },
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    },
    {
      "plugin": "@nx/js/typescript",
      "options": {
        "typecheck": {
          "targetName": "typecheck"
        },
        "build": {
          "targetName": "build",
          "configName": "tsconfig.lib.json",
          "buildDepsName": "build-deps",
          "watchDepsName": "watch-deps"
        }
      }
    }
  ],
  "targetDefaults": {
    "build": {
      "options": {
        "outputPath": "dist/{projectRoot}"
      }
    },
    "@nx/js:tsc": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["default", "^default"]
    }
  }
}
```

### ./demo/website-layout/project.json

Referenced Tasks
- website-layout-typecheck-target-hinzufuegen Ergänze Target "typecheck" auf Basis von @nx/js:tsc mit noEmit.

Ersetze die gesamte Datei durch:

```json
{
  "name": "website-layout",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "{projectRoot}/src",
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
    "typecheck": {
      "executor": "@nx/js:tsc",
      "options": {
        "tsConfig": "demo/website-layout/tsconfig.lib.json",
        "noEmit": true
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

Hinweise:
- Das neue "typecheck"-Target greift die targetDefaults für "@nx/js:tsc" aus nx.json auf (Cache/dependsOn/inputs).
- Vite-Plugin-Option "typecheckTargetName" ist nun konsistent mit dem echten Target "typecheck".

## Beispiel-Verbesserungen für die Anfrage

- „Bitte korrigiere meine nx.json: Das Typecheck-Target soll typecheck heißen (nicht tsc:typecheck), und preVersionCommand soll alle Projekte bauen.“
- „Füge in demo/website-layout ein TypeScript-Typecheck-Target mit @nx/js:tsc und noEmit: true hinzu, das tsconfig.lib.json verwendet.“