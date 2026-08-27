import { readFile } from 'node:fs/promises';
import { parseAst, transformWithEsbuild } from 'vite';

import type { TDemoFile } from './scanDemos.ts';

export const virtualDemoModulePrefix = 'virtual:tdemo-file:';

type TDemoNavigationMetadata = {
  title?: string;
  group?: string;
  navPath?: string | string[];
  order?: number;
};

type TAstNode = {
  type: string;
  [key: string]: unknown;
};

export async function generateRegistry(
  demoFiles: readonly TDemoFile[],
  includeTags: readonly string[],
  excludeTags: readonly string[],
): Promise<string> {
  if (includeTags.length > 0 || excludeTags.length > 0) {
    return generateTaggedRegistry(demoFiles, includeTags, excludeTags);
  }

  return generateLazyRegistry(demoFiles);
}

async function generateLazyRegistry(demoFiles: readonly TDemoFile[]): Promise<string> {
  const metadata = await Promise.all(demoFiles.map((file) => readDemoNavigationMetadata(file)));

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
        ...${JSON.stringify({ title: metadata[index]?.title ?? getDemoTitle(file.filename), ...metadata[index] })},
        filename: ${JSON.stringify(file.filename)},
        load: () => import(${JSON.stringify(getVirtualDemoModuleId(index))}).then((mod) => normalizeDemoDefinition(${JSON.stringify(file.filename)}, mod)),
      }`,
        )
        .join(',\n')}
    ]
  `;
}

async function readDemoNavigationMetadata(file: TDemoFile): Promise<TDemoNavigationMetadata> {
  try {
    const source = await readFile(file.absolutePath, 'utf-8');
    const transformed = await transformWithEsbuild(source, file.absolutePath, {
      format: 'esm',
      loader: 'ts',
      target: 'esnext',
    });
    const definition = findDemoDefinition(parseAst(transformed.code) as TAstNode);

    if (!definition) {
      return {};
    }

    const title = readStringProperty(definition, 'title');
    const group = readStringProperty(definition, 'group');
    const navPath = readNavPathProperty(definition, 'navPath');
    const order = readNumberProperty(definition, 'order');

    return {
      ...(title !== undefined ? { title } : {}),
      ...(group !== undefined ? { group } : {}),
      ...(navPath !== undefined ? { navPath } : {}),
      ...(order !== undefined ? { order } : {}),
    };
  } catch {
    return {};
  }
}

function findDemoDefinition(node: TAstNode): TAstNode | undefined {
  if (node.type === 'CallExpression') {
    const callee = isAstNode(node['callee']) ? node['callee'] : undefined;
    const args = Array.isArray(node['arguments']) ? node['arguments'] : [];
    const definition = isAstNode(args[0]) ? args[0] : undefined;

    if (callee?.type === 'Identifier' && callee['name'] === 'defineDemo' && definition?.type === 'ObjectExpression') {
      return definition;
    }
  }

  for (const value of Object.values(node)) {
    if (isAstNode(value)) {
      const definition = findDemoDefinition(value);
      if (definition) return definition;
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (!isAstNode(item)) continue;
        const definition = findDemoDefinition(item);
        if (definition) return definition;
      }
    }
  }

  return undefined;
}

function readStringProperty(definition: TAstNode, name: string): string | undefined {
  const value = readPropertyValue(definition, name);
  return typeof value === 'string' ? value : undefined;
}

function readNumberProperty(definition: TAstNode, name: string): number | undefined {
  const value = readPropertyValue(definition, name);
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readNavPathProperty(definition: TAstNode, name: string): string | string[] | undefined {
  const value = readPropertyValue(definition, name);

  if (typeof value === 'string') {
    return value;
  }

  return Array.isArray(value) && value.every((segment) => typeof segment === 'string') ? value : undefined;
}

function readPropertyValue(definition: TAstNode, name: string): unknown {
  const properties = Array.isArray(definition['properties']) ? definition['properties'] : [];

  for (const property of properties) {
    if (!isAstNode(property) || property.type !== 'Property') continue;

    const key = isAstNode(property['key']) ? property['key'] : undefined;
    const propertyName = key?.type === 'Identifier' ? key['name'] : key?.type === 'Literal' ? key['value'] : undefined;

    if (propertyName === name && isAstNode(property['value'])) {
      return readStaticValue(property['value']);
    }
  }

  return undefined;
}

function readStaticValue(node: TAstNode): unknown {
  if (node.type === 'Literal') {
    return node['value'];
  }

  if (node.type === 'ArrayExpression') {
    const elements = Array.isArray(node['elements']) ? node['elements'] : [];
    const values = elements.map((element) => (isAstNode(element) ? readStaticValue(element) : undefined));
    return values.every((value) => typeof value === 'string') ? values : undefined;
  }

  if (node.type === 'UnaryExpression' && node['operator'] === '-' && isAstNode(node['argument'])) {
    const value = readStaticValue(node['argument']);
    return typeof value === 'number' ? -value : undefined;
  }

  if (node.type === 'TemplateLiteral') {
    const expressions = Array.isArray(node['expressions']) ? node['expressions'] : [];
    const quasis = Array.isArray(node['quasis']) ? node['quasis'] : [];
    const quasi = isAstNode(quasis[0]) && isAstNode(quasis[0]['value']) ? quasis[0]['value'] : undefined;

    if (expressions.length === 0 && typeof quasi?.['cooked'] === 'string') {
      return quasi['cooked'];
    }
  }

  return undefined;
}

function isAstNode(value: unknown): value is TAstNode {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
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
