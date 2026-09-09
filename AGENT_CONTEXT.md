# AGENT_CONTEXT.md

Automatically created by a coding agent as an onboarding context cache for this repository.

## Repository

| Fact | Value |
| --- | --- |
| Root | `/opt` |
| Git remote | `git@github.com:trunkjs/trunkjs-monorepo.git` |
| Default working branch | `main` |
| Package manager | npm workspaces |
| Nx | yes |
| Last verified | 2026-09-01 |

## Frequently used paths

| Path | Purpose |
| --- | --- |
| `package.json` | Root workspace manifest |
| `nx.json` | Nx workspace + release configuration |
| `.nxignore` | Excludes non-workspace paths from Nx project detection |
| `.github/workflows/publish.yml` | GitHub Actions npm publish workflow |
| `packages/element-relocator/package.json` | Package manifest for `@trunkjs/element-relocator` |
| `packages/element-relocator/project.json` | Nx project config for `element-relocator` |
| `packages/form/package.json` | Package manifest for `@trunkjs/form` |
| `packages/form/project.json` | Nx project config for `form` |

## Release and publish setup

| Fact | Value |
| --- | --- |
| Release mode | Nx independent releases |
| Publish workflow | `.github/workflows/publish.yml` |
| Publish trigger | Git tag pattern `**@*.*.*` |
| GitHub tag push limit | No GitHub Actions tag events when more than 3 tags are pushed at once |
| Publish command in CI | `npx nx release publish --access public -p <package> --provenance` |
| Trusted publishing policy | Configure `npm trust` before any later automated/CI publish; first-ever package publish is a one-time manual bootstrap because npm requires the package to already exist |
| Build output root | `dist/{projectRoot}` |
| Nx ignore rule | `.agents/**` excluded to prevent skill reference snapshots being detected as projects |
| Last verified | 2026-09-01 |

## Package snapshot: `@trunkjs/element-relocator`

| Fact | Value |
| --- | --- |
| Package dir | `packages/element-relocator` |
| npm name | `@trunkjs/element-relocator` |
| Version in repo | `1.0.0` |
| Repository directory | `packages/element-relocator` |
| First publish required before `npm trust` | yes |
| npm registry status | `npm view` returned `E404 Not Found` |
| Last verified | 2026-09-01 |

## Package snapshot: `@trunkjs/form`

| Fact | Value |
| --- | --- |
| Package dir | `packages/form` |
| npm name | `@trunkjs/form` |
| Version in repo | `1.0.0` |
| Repository directory | `packages/form` |
| Current build target | `@nx/vite:build` |
| Trusted publishing workflow | `trunkjs/trunkjs-monorepo` + `publish.yml` |
| Trusted publishing status | configured for GitHub Actions, permission `publish` |
| First publish required before `npm trust` | completed |
| npm registry status | published, `npm view` returned `1.0.0` |
| Last verified | 2026-09-01 |
