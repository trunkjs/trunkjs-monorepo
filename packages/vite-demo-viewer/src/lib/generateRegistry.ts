import type { TDemoFile } from './scanDemos.ts';

export const virtualDemoModulePrefix = 'virtual:tdemo-file:';

export function generateRegistry(
  demoFiles: readonly TDemoFile[],
  includeTags: readonly string[],
  excludeTags: readonly string[],
): string {
  if (includeTags.length > 0 || excludeTags.length > 0) {
    return generateTaggedRegistry(demoFiles, includeTags, excludeTags);
  }

  return generateLazyRegistry(demoFiles);
}

function generateLazyRegistry(demoFiles: readonly TDemoFile[]): string {
  return `
    function normalizeDemoDefinition(filename, mod) {
      const definition = mod.default ?? mod
      const baseDefinition = typeof definition === 'object' && definition !== null ? definition : {}
      const render =
        typeof baseDefinition.render === 'function'
          ? baseDefinition.render
          : typeof mod.render === 'function'
            ? mod.render
            : undefined

      return {
        ...baseDefinition,
        filename: baseDefinition.filename ?? filename,
        ...(render ? { render } : {}),
      }
    }

    export const demos = [
      ${demoFiles
        .map(
          (file, index) => `{
        filename: ${JSON.stringify(file.filename)},
        title: ${JSON.stringify(getDemoTitle(file.filename))},
        load: () => import(${JSON.stringify(getVirtualDemoModuleId(index))}).then((mod) => normalizeDemoDefinition(${JSON.stringify(file.filename)}, mod)),
      }`,
        )
        .join(',\n')}
    ]
  `;
}

function generateTaggedRegistry(
  demoFiles: readonly TDemoFile[],
  includeTags: readonly string[],
  excludeTags: readonly string[],
): string {
  return `
    ${demoFiles.map((_file, index) => `import * as demoModule${index} from ${JSON.stringify(getVirtualDemoModuleId(index))}`).join('\n')}

    const includeTags = ${JSON.stringify(includeTags)}
    const excludeTags = ${JSON.stringify(excludeTags)}

    function normalizeDemoDefinition(filename, mod) {
      const definition = mod.default ?? mod
      const baseDefinition = typeof definition === 'object' && definition !== null ? definition : {}
      const render =
        typeof baseDefinition.render === 'function'
          ? baseDefinition.render
          : typeof mod.render === 'function'
            ? mod.render
            : undefined

      return {
        ...baseDefinition,
        filename: baseDefinition.filename ?? filename,
        ...(render ? { render } : {}),
      }
    }

    function matchesTags(demo) {
      const tags = Array.isArray(demo.tags) ? demo.tags : []

      if (excludeTags.some((tag) => tags.includes(tag))) {
        return false
      }

      return includeTags.length === 0 || includeTags.some((tag) => tags.includes(tag))
    }

    export const demos = [
      ${demoFiles.map((file, index) => `normalizeDemoDefinition(${JSON.stringify(file.filename)}, demoModule${index})`).join(',\n')}
    ].filter(matchesTags)
  `;
}

function getDemoTitle(filename: string): string {
  return filename
    .split('/')
    .pop()
    ?.replace(/\.demo\.ts$/, '') ?? filename;
}

export function getVirtualDemoModuleId(index: number): string {
  return `${virtualDemoModulePrefix}${index}`;
}
