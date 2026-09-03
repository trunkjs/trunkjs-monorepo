# Proposal: TypeSpec — Runtime Metadata for Web Components

Status: Draft
Working title: TypeSpec

## Summary

Introduce a small metadata system for Web Components that can be consumed at runtime inside normal application views while keeping detailed component metadata out of the initial bundle. The system should be TypeScript-first, Vite-native, lazy-loadable, and compatible with existing ecosystem standards rather than replacing them.

The initial implementation should stay intentionally small and consist of two packages:

- `@trunkjs/typespec`: the shared TypeSpec contract plus a viewer Web Component.
- `@trunkjs/vite-plugin-typespec`: discovery, virtual-module generation, HMR integration, and lazy chunk loading through Vite.

The exact package names remain open until the project name is finalized.

## Problem

TrunkJS components already have documentation, but component API information is not directly available on screen inside demos, development views, or other runtime contexts. A component info viewer should be able to show the currently valid public surface of a component without requiring a separate documentation application or loading metadata for every component up front.

Relevant information includes, for example:

- modifier classes,
- attributes and properties,
- events,
- slots,
- CSS custom properties,
- CSS parts,
- custom states,
- descriptions and type information,
- metadata such as whether a CSS custom property represents a color, length, spacing value, etc.

## Ecosystem research and positioning

This proposal should not introduce another isolated Web Component metadata format if an existing standard already represents the information well.

### Custom Elements Manifest

The closest existing standard is Custom Elements Manifest (CEM), commonly exposed as `custom-elements.json`. CEM already models much of the public API surface relevant to Web Components, including attributes, fields/properties, events, slots, CSS custom properties, CSS parts, custom states, descriptions, type information, and deprecation metadata.

TypeSpec should therefore treat CEM as the primary interoperability target and reuse its vocabulary and semantics wherever possible. TypeSpec-specific metadata should exist only where runtime usage or TrunkJS-specific needs require information that CEM does not express directly.

The intended relationship is:

```text
component source / TypeSpec source
            |
            +--> TypeSpec runtime metadata
            |
            +--> Custom Elements Manifest interoperability
```

TypeSpec should complement CEM, not compete with it.

### API Viewer Element

Open WC's API Viewer Element demonstrates that CEM can drive a useful interactive component API viewer. It already renders common Web Component API information from a manifest and includes an interactive playground.

The important distinction for TypeSpec is architectural: the proposed viewer should be embeddable directly in any TrunkJS application or demo view and should request metadata for one component on demand rather than requiring one monolithic manifest to be loaded first.

### Storybook Autodocs

Storybook can consume Web Component metadata and produce generated documentation and controls. This confirms that structured component metadata is useful beyond static documentation.

TypeSpec is deliberately narrower: it should not become another documentation application. The goal is a small metadata layer and viewer that can be embedded into an existing application.

### JetBrains Web-Types

JetBrains Web-Types is another established metadata format for IDE and framework tooling. Because the name `web-types` is already strongly associated with JetBrains tooling, the initially discussed `.webtype.ts` filename should be avoided to reduce ambiguity.

Possible TypeSpec source filenames should instead use a project-specific form such as:

```text
nt2-two-col.typespec.ts
```

The final filename convention remains an open decision.

### Existing TypeSpec name

`TypeSpec` is already the name of Microsoft's API description language. For that reason, TypeSpec should remain a working title until naming and package-name availability have been checked explicitly. The architectural proposal should not depend on the final brand name.

## Proposed architecture

Each component may optionally provide a small TypeScript metadata module next to its implementation:

```text
src/components/nt2-two-col/
  nt2-two-col.ts
  nt2-two-col.css
  nt2-two-col.typespec.ts
```

Example:

```ts
export default defineTypeSpec({
  component: 'nt2-two-col',

  modifiers: {
    reverse: {
      class: 'nt2-two-col--reverse',
      description: 'Reverses the visual column order',
    },
  },

  cssProperties: {
    '--nt2-two-col-gap': {
      type: 'length',
      description: 'Gap between both columns',
    },
  },
})
```

The TypeScript contract should preferably use `satisfies` or a `defineTypeSpec()` helper so that metadata remains validated while preserving useful literal types.

## Vite integration

`@trunkjs/vite-plugin-typespec` scans configured source roots for TypeSpec modules and exposes a virtual registry. The registry should contain lightweight metadata plus lazy loader functions rather than eagerly embedding every component definition.

Conceptually:

```ts
export const components = {
  'nt2-two-col': {
    title: 'Two Column',
    load: () => import('/src/components/nt2-two-col/nt2-two-col.typespec.ts'),
  },
}
```

The viewer or any other consumer can then request one component definition:

```ts
const definition = await components['nt2-two-col'].load()
```

Because the detailed modules are referenced through dynamic imports, Vite can emit them as asynchronous chunks that are loaded only when required.

The plugin should expose the registry through a virtual module rather than requiring a generated include file on disk unless a later use case explicitly benefits from physical output.

Example consumer API:

```ts
import { components, loadTypeSpec } from 'virtual:typespec'
```

The exact virtual-module API is open for refinement.

## Runtime viewer

The first consumer should be a small Web Component shipped by `@trunkjs/typespec`.

Possible usage:

```html
<type-spec for="nt2-two-col"></type-spec>
```

or, if the final name changes, an equivalent neutral tag name.

A demo could therefore contain the real component and its current API information in the same application:

```html
<nt2-demo>
  <nt2-two-col>...</nt2-two-col>
  <type-spec for="nt2-two-col"></type-spec>
</nt2-demo>
```

The viewer requests the relevant metadata only when it is actually used.

## Small always-loaded index

The Vite plugin may generate a very small index containing only discovery information needed for navigation, search, or component selection, while detailed metadata remains lazy-loaded.

Example:

```ts
export const index = {
  'nt2-two-col': {
    tagName: 'nt2-two-col',
    title: 'Two Column',
    category: 'layout',
  },
}
```

This allows a component picker or search UI to work without loading every detailed TypeSpec module.

## Metadata model

The first contract should focus on public component API information and avoid turning TypeSpec files into Storybook-style story definitions.

Likely fields include:

- component/tag name,
- title and description,
- attributes,
- properties,
- events,
- slots,
- CSS custom properties,
- CSS parts,
- custom states,
- modifier classes,
- accessibility notes where useful,
- category or lightweight discovery metadata.

Where CEM already has a suitable representation, TypeSpec should align with it. TrunkJS-specific extensions, such as modifier classes or additional CSS token semantics, should be clearly separated from CEM-compatible fields.

Demo rendering and large example implementations should remain outside the core metadata contract unless a concrete use case later proves that they belong there.

## Interoperability direction

A useful long-term model is:

```text
                       TypeSpec
                          |
            +-------------+-------------+
            |             |             |
            v             v             v
      Runtime viewer     CEM export   other tooling
```

Potential future capabilities include importing existing CEM data, exporting CEM from TypeSpec-compatible source, or exposing adapters for other tooling formats such as Web-Types. These are explicitly not required for the first implementation.

## Initial package scope

The proposal starts with only two packages.

### `@trunkjs/typespec`

Responsibilities:

- TypeScript metadata contract,
- `defineTypeSpec()` helper if useful,
- runtime types,
- viewer Web Component,
- rendering of component API information.

The viewer and contract stay together initially because there is not yet a demonstrated need for a third core package. They can be split later if package weight or independent consumption makes that valuable.

### `@trunkjs/vite-plugin-typespec`

Responsibilities:

- source discovery,
- virtual registry generation,
- dynamic imports and lazy chunking,
- development-mode integration,
- HMR when TypeSpec files change,
- optional lightweight global component index.

It should not own presentation logic.

## Naming

`TypeSpec` is the working title only.

Candidates discussed so far:

- TypeSpec
- DynTypes
- DynaTypes
- TypePack

Possible package naming under the working title:

```text
@trunkjs/typespec
@trunkjs/vite-plugin-typespec
```

Other possible plugin names such as `vite-typespec`, `vite-typespec-bundler`, or `typespec-vite` can be evaluated once the final project name is chosen.

Naming criteria should include:

- no collision or strong ambiguity with established projects,
- clear relationship to component metadata rather than TypeScript's type system,
- concise package names,
- suitability for both the runtime viewer and build integration.

Because Microsoft already uses `TypeSpec` for its API description language, an alternative final name is likely preferable unless the TrunkJS package scope makes the distinction sufficiently clear.

## Non-goals for the first version

The initial implementation should not attempt to become:

- a full documentation site generator,
- a Storybook replacement,
- a new universal metadata standard,
- an IDE language service,
- a story/demo authoring framework,
- a static-site publishing pipeline.

Those capabilities can consume the metadata later if useful.

## Open questions

1. What should the final project name be?
2. Should the source file be `*.typespec.ts`, another explicit suffix, or be discovered through configuration?
3. Which fields can map 1:1 to Custom Elements Manifest and which require TypeSpec extensions?
4. Should CEM import/export exist in the first implementation or be deferred?
5. Should the viewer render only API information or also provide small interactive controls?
6. How much metadata should live in the always-loaded index versus the lazy component chunk?
7. Should one component correspond to exactly one metadata module, or should modules be able to describe multiple related elements?
8. Should the viewer package remain combined with the metadata contract after the first implementation?

## Proposed first implementation milestone

Build the smallest end-to-end slice with one real TrunkJS component:

1. define the minimal metadata contract,
2. create one `*.typespec.ts` component description,
3. implement Vite discovery and `virtual:typespec`,
4. prove that the detailed definition becomes a lazy chunk,
5. implement a minimal `<type-spec>` viewer,
6. verify HMR in development,
7. compare the resulting metadata against CEM and document the mapping gaps.

The result of this milestone should be enough to decide the final contract, naming, and whether CEM conversion belongs in the core packages.
