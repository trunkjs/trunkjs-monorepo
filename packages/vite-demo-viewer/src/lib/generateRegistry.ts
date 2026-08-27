import type { TDemoFile } from './scanDemos.ts';

export const virtualDemoModulePrefix = 'virtual:tdemo-file:';

export function generateRegistry(demoFiles: readonly TDemoFile[]): string {
  return `
    ${demoFiles.map((_file, index) => `import * as demoModule${index} from ${JSON.stringify(getVirtualDemoModuleId(index))}`).join('\n')}

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
      ${demoFiles.map((file, index) => `normalizeDemoDefinition(${JSON.stringify(file.filename)}, demoModule${index})`).join(',\n')}
    ]
  `;
}

export function getVirtualDemoModuleId(index: number): string {
  return `${virtualDemoModulePrefix}${index}`;
}
