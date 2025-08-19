# @trunkjs/source

Monorepo for TrunkJS maintained with [Nx](https://nx.dev/).

## Setup & Development

This repository uses nfra kickstart to set up a development environment with docker containers:

- [Install nfra kickstart](https://nfra.infracamp.org)
- Clone the repository and run `kickstart` in the root directory.
- Inside the container, run `nx dev <packageName>` to execute the development server on port 4000.



## Packages

<!-- Please also maintain the CODEOWNERS file when adjusting the table below -->

| Name | Contact |
| ---- | ------- |



## Working with the repository

### Starting the development container

run `kickstart` in the root directory to start the development container.

See [https://nfra.infracamp.org/](https://nfra.infracamp.org/) for more information about the development container.

### Common Commands

- `nx dev <package>`: Start the development server for a package
- `nx build <package>`: Build a package
- `nx test <package>`: Run unit tests for a package
- `nx lint <package>`: Run linter for a package
- `nx show project <package>`: Show all targets of a package

Try out `npx nx dev ntl-2col` and make some changes [to the code](nextrap-elements/nte-element-highlighter/src).

**Note**: When renaming packages or moving them to a different directory, make sure to update all import paths
and run `npm update` on the monorepos root to update the package links.

## Creating new packages

1. Switch to a feature branch to benefit from CI checks and to avoid breaking the main branch.
2. Use our [Nx Generator](./nextrap-base/nt-nx-generators) to generate new libs or apps:

**Create new element Package**:

`nx g @nx/js:library <packageName> --directory=packages/<packageName>`

3. Run `npm i` and `nx run <new-package>:build` to verify that the new package has been created successfully.

4. Add the new package to the _Packages_ list in this README and to the [CODEOWNERS](./CODEOWNERS) file.

The package will now automatically be picked up by the CI and Release workflows.

When you are ready, create a pull request to merge your changes into the `main` branch.

## Releases

> [!WARNING]
> Releases should only be created from the `main` branch!

The repo is configured so that each package is independently released with its own version.
This means that you can release a single or more packages without having to release the entire repo.

To create new versions, run the following commands:

- `nx release --skip-publish -p <package-1[,package-2,...]>` (if `-p` is omitted, you will be asked to select a version for _all_ packages)
- `git push --follow-tags origin main`
- The [publish-tags Action](./.github/workflows/publish-tags.yml) will build and release the desired packages to npm

> [!WARNING]
> Make sure to push the tags, otherwise the publish-tags workflow won't run!
>
> If you use a GUI such as GitHub Desktop, make sure that tags are pushed as well,
> as this is not the default behavior.

### Branches

**Feature branches** are used for development and should be created from the `main` branch. The Name should be "feat/<yourName>/<featureName>".

### Dependencies

### Configuration and Targets

All tasks are defined as [targets](https://nx.dev/reference/project-configuration#project-configuration).
These targets may be defined globally and be inferred by plugins such as `@nx/vite`
or they may be defined in the `project.json` of each package. This hierarchy
defines the capabilities of each package.

Read the [Project Configuration](https://nx.dev/reference/project-configuration#project-configuration)
article to learn how this cascade of tasks works in detail.

To see all targets/capabilities of a package, run

`npx nx show project <package>`.
