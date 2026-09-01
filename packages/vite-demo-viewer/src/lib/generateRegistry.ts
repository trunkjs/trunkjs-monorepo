import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { parseAst, transformWithEsbuild } from 'vite';

import type { TDemoFile } from './scanDemos.ts';

export const virtualDemoModulePrefix = 'virtual:tdemo-file:';
export const virtualDemoSourcePrefix = 'virtual:tdemo-source:';
export const virtualDemoSourceInfoPrefix = 'virtual:tdemo-source-info:';

const handlerNames = ['onClick', 'onChange', 'onInput', 'onApply', 'validate'] as const;
type THandlerName = (typeof handlerNames)[number];
type TSnippet = { code: string; language: 'js' | 'scss'; label?: string };
type TSourceInfo = {
  example?: TSnippet;
  afterRender?: TSnippet;
  styles?: TSnippet[];
  controls?: Record<string, Partial<Record<THandlerName, TSnippet>>>;
};
type TDemoNavigationMetadata = { title?: string; group?: string; navPath?: string | string[]; order?: number };
type TAstNode = { type: string; start?: number; end?: number; [key: string]: unknown };

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
    ${normalizerSource()}
    export const demos = [
      ${demoFiles.map((file, index) => `{
        ...${JSON.stringify({ title: metadata[index]?.title ?? getDemoTitle(file.filename), ...metadata[index] })},
        filename: ${JSON.stringify(file.filename)},
        load: () => Promise.all([
          import(${JSON.stringify(getVirtualDemoModuleId(index))}),
          import(${JSON.stringify(getVirtualDemoSourceId(index))}),
          import(${JSON.stringify(getVirtualDemoSourceInfoId(index))}),
        ]).then(([mod, sourceModule, sourceInfoModule]) =>
          normalizeDemoDefinition(${JSON.stringify(file.filename)}, mod, sourceModule.default, sourceInfoModule.default),
        ),
      }`).join(',\n')}
    ]
  `;
}

function normalizerSource(): string {
  return `function normalizeDemoDefinition(filename, mod, source, extractedSourceInfo) {
      const definition = mod.default ?? mod
      const baseDefinition = typeof definition === 'object' && definition !== null ? definition : {}
      const render = typeof baseDefinition.render === 'function' ? baseDefinition.render : typeof mod.render === 'function' ? mod.render : undefined
      const runtimeExample = typeof baseDefinition.html === 'string'
        ? { code: baseDefinition.html, language: 'html' }
        : typeof baseDefinition.markdown === 'string'
          ? { code: baseDefinition.markdown, language: 'markdown' }
          : undefined
      const sourceInfo = {
        ...(extractedSourceInfo ?? {}),
        ...(baseDefinition.sourceInfo ?? {}),
        ...(runtimeExample ? { example: runtimeExample } : {}),
        controls: {
          ...(extractedSourceInfo?.controls ?? {}),
          ...(baseDefinition.sourceInfo?.controls ?? {}),
        },
      }
      return {
        ...baseDefinition,
        filename: baseDefinition.filename ?? filename,
        ...(render ? { render } : {}),
        ...(typeof source === 'string' ? { source } : {}),
        ...(Object.keys(sourceInfo).length ? { sourceInfo } : {}),
      }
    }`;
}

async function readDemoNavigationMetadata(file: TDemoFile): Promise<TDemoNavigationMetadata> {
  try {
    const { definition } = await parseDemoFile(file);
    if (!definition) return {};
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

export async function readDemoSourceInfo(file: TDemoFile): Promise<TSourceInfo> {
  try {
    const { code, ast, definition } = await parseDemoFile(file);
    if (!definition) return {};
    const sourceInfo = extractSourceInfo(code, ast, definition);
    const styles = await readImportedScssSnippets(ast, file.absolutePath);
    return { ...sourceInfo, ...(styles.length ? { styles } : {}) };
  } catch {
    return {};
  }
}

async function parseDemoFile(file: TDemoFile) {
  const source = await readFile(file.absolutePath, 'utf-8');
  const transformed = await transformWithEsbuild(source, file.absolutePath, {
    format: 'esm', loader: 'ts', target: 'esnext', sourcemap: false,
  });
  const ast = parseAst(transformed.code) as TAstNode;
  return { code: transformed.code, ast, definition: findDemoDefinition(ast) };
}

async function readImportedScssSnippets(ast: TAstNode, demoPath: string): Promise<TSnippet[]> {
  const imports: string[] = [];
  walk(ast, (node) => {
    if (node.type !== 'ImportDeclaration') return;
    const source = isAstNode(node['source']) ? node['source']['value'] : undefined;
    if (typeof source !== 'string') return;
    const filename = source.split(/[?#]/, 1)[0];
    if (filename?.startsWith('.') && filename.toLowerCase().endsWith('.scss')) imports.push(filename);
  });

  const uniqueImports = [...new Set(imports)];
  const snippets = await Promise.all(uniqueImports.map(async (importPath): Promise<TSnippet | undefined> => {
    try {
      const absolutePath = resolve(dirname(demoPath), importPath);
      return { code: await readFile(absolutePath, 'utf-8'), language: 'scss', label: basename(importPath) };
    } catch {
      return undefined;
    }
  }));
  return snippets.filter((snippet): snippet is TSnippet => snippet !== undefined);
}

function extractSourceInfo(code: string, ast: TAstNode, definition: TAstNode): TSourceInfo {
  const inspectableFunctions = findInspectableFunctions(ast, code);
  const example = readFunctionPropertySnippet(definition, 'render', code, inspectableFunctions);
  const afterRender = readFunctionPropertySnippet(definition, 'afterRender', code, inspectableFunctions);
  const controls: Record<string, Partial<Record<THandlerName, TSnippet>>> = {};
  const controlsDefinition = readPropertyNode(definition, 'controls');
  const items = controlsDefinition ? readPropertyNode(controlsDefinition, 'items') : undefined;
  if (items?.type === 'ArrayExpression') extractControlSnippets(items, code, inspectableFunctions, controls, '');
  return {
    ...(example ? { example } : {}),
    ...(afterRender ? { afterRender } : {}),
    ...(Object.keys(controls).length ? { controls } : {}),
  };
}

function findInspectableFunctions(ast: TAstNode, code: string): Map<string, TSnippet> {
  const result = new Map<string, TSnippet>();
  walk(ast, (node) => {
    if (node.type !== 'VariableDeclarator') return;
    const id = isAstNode(node['id']) ? node['id'] : undefined;
    const init = isAstNode(node['init']) ? node['init'] : undefined;
    if (id?.type !== 'Identifier' || init?.type !== 'CallExpression') return;
    const callee = isAstNode(init['callee']) ? init['callee'] : undefined;
    const args = Array.isArray(init['arguments']) ? init['arguments'] : [];
    const fn = isAstNode(args[0]) ? args[0] : undefined;
    if (callee?.type === 'Identifier' && callee['name'] === 'inspectable' && fn) {
      const snippet = functionSnippet(fn, code);
      if (snippet) result.set(String(id['name']), snippet);
    }
  });
  return result;
}

function extractControlSnippets(
  array: TAstNode,
  code: string,
  inspectable: Map<string, TSnippet>,
  target: Record<string, Partial<Record<THandlerName, TSnippet>>>,
  parentPath: string,
) {
  const elements = Array.isArray(array['elements']) ? array['elements'] : [];
  elements.forEach((value, index) => {
    if (!isAstNode(value) || value.type !== 'ObjectExpression') return;
    const path = parentPath ? `${parentPath}.${index}` : String(index);
    const id = readStringProperty(value, 'id') ?? path;
    const snippets: Partial<Record<THandlerName, TSnippet>> = {};
    for (const name of handlerNames) {
      const snippet = readFunctionPropertySnippet(value, name, code, inspectable);
      if (snippet) snippets[name] = snippet;
    }
    if (Object.keys(snippets).length) target[id] = snippets;
    const children = readPropertyNode(value, 'items');
    if (children?.type === 'ArrayExpression') extractControlSnippets(children, code, inspectable, target, path);
  });
}

function readFunctionPropertySnippet(
  object: TAstNode,
  name: string,
  code: string,
  inspectable: Map<string, TSnippet>,
): TSnippet | undefined {
  const value = readPropertyNode(object, name);
  if (!value) return undefined;
  if (value.type === 'Identifier') return inspectable.get(String(value['name']));
  return functionSnippet(value, code);
}

function functionSnippet(node: TAstNode, code: string): TSnippet | undefined {
  const body = isAstNode(node['body']) ? node['body'] : undefined;
  if (!body || body.start === undefined || body.end === undefined) return undefined;
  const raw = body.type === 'BlockStatement'
    ? code.slice(body.start + 1, body.end - 1)
    : code.slice(body.start, body.end);
  const dedented = dedent(raw);
  return dedented ? { code: dedented, language: 'js' } : undefined;
}

function dedent(value: string): string {
  const lines = value.replace(/^\s*\n|\n\s*$/g, '').split('\n');
  const nonEmpty = lines.filter((line) => line.trim());
  const indent = nonEmpty.length ? Math.min(...nonEmpty.map((line) => line.match(/^\s*/)?.[0].length ?? 0)) : 0;
  return lines.map((line) => line.slice(indent)).join('\n').trimEnd();
}

function walk(node: TAstNode, visitor: (node: TAstNode) => void) {
  visitor(node);
  for (const value of Object.values(node)) {
    if (isAstNode(value)) walk(value, visitor);
    else if (Array.isArray(value)) for (const item of value) if (isAstNode(item)) walk(item, visitor);
  }
}

function findDemoDefinition(node: TAstNode): TAstNode | undefined {
  const defineDemoArgument = findDefineDemoArgument(node);
  if (defineDemoArgument) return defineDemoArgument;

  if (node.type === 'Program') {
    let defaultLocalName: string | undefined;
    let directDefault: TAstNode | undefined;
    walk(node, (candidate) => {
      if (candidate.type === 'ExportDefaultDeclaration') {
        const declaration = isAstNode(candidate['declaration']) ? candidate['declaration'] : undefined;
        if (declaration?.type === 'ObjectExpression') directDefault = declaration;
        else if (declaration?.type === 'Identifier') defaultLocalName = String(declaration['name']);
      }
      if (candidate.type !== 'ExportSpecifier') return;
      const exported = isAstNode(candidate['exported']) ? candidate['exported'] : undefined;
      const local = isAstNode(candidate['local']) ? candidate['local'] : undefined;
      if (exported?.type === 'Identifier' && exported['name'] === 'default' && local?.type === 'Identifier') {
        defaultLocalName = String(local['name']);
      }
    });
    if (directDefault) return directDefault;
    if (defaultLocalName) {
      let result: TAstNode | undefined;
      walk(node, (candidate) => {
        if (candidate.type !== 'VariableDeclarator') return;
        const id = isAstNode(candidate['id']) ? candidate['id'] : undefined;
        const init = isAstNode(candidate['init']) ? candidate['init'] : undefined;
        if (id?.type === 'Identifier' && id['name'] === defaultLocalName && init?.type === 'ObjectExpression') result = init;
      });
      if (result) return result;
    }
  }
  return undefined;
}

function findDefineDemoArgument(node: TAstNode): TAstNode | undefined {
  if (node.type === 'CallExpression') {
    const callee = isAstNode(node['callee']) ? node['callee'] : undefined;
    const args = Array.isArray(node['arguments']) ? node['arguments'] : [];
    const definition = isAstNode(args[0]) ? args[0] : undefined;
    if (callee?.type === 'Identifier' && callee['name'] === 'defineDemo' && definition?.type === 'ObjectExpression') return definition;
  }
  for (const value of Object.values(node)) {
    if (isAstNode(value)) { const found = findDefineDemoArgument(value); if (found) return found; }
    else if (Array.isArray(value)) for (const item of value) if (isAstNode(item)) { const found = findDefineDemoArgument(item); if (found) return found; }
  }
  return undefined;
}

function readPropertyNode(definition: TAstNode, name: string): TAstNode | undefined {
  const properties = Array.isArray(definition['properties']) ? definition['properties'] : [];
  for (const property of properties) {
    if (!isAstNode(property) || property.type !== 'Property') continue;
    const key = isAstNode(property['key']) ? property['key'] : undefined;
    const propertyName = key?.type === 'Identifier' ? key['name'] : key?.type === 'Literal' ? key['value'] : undefined;
    if (propertyName === name && isAstNode(property['value'])) return property['value'];
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
  if (typeof value === 'string') return value;
  return Array.isArray(value) && value.every((segment) => typeof segment === 'string') ? value : undefined;
}
function readPropertyValue(definition: TAstNode, name: string): unknown {
  const node = readPropertyNode(definition, name);
  return node ? readStaticValue(node) : undefined;
}
function readStaticValue(node: TAstNode): unknown {
  if (node.type === 'Literal') return node['value'];
  if (node.type === 'ArrayExpression') {
    const elements = Array.isArray(node['elements']) ? node['elements'] : [];
    const values = elements.map((element) => isAstNode(element) ? readStaticValue(element) : undefined);
    return values.every((value) => typeof value === 'string') ? values : undefined;
  }
  if (node.type === 'UnaryExpression' && node['operator'] === '-' && isAstNode(node['argument'])) {
    const value = readStaticValue(node['argument']); return typeof value === 'number' ? -value : undefined;
  }
  if (node.type === 'TemplateLiteral') {
    const expressions = Array.isArray(node['expressions']) ? node['expressions'] : [];
    const quasis = Array.isArray(node['quasis']) ? node['quasis'] : [];
    const quasi = isAstNode(quasis[0]) && isAstNode(quasis[0]['value']) ? quasis[0]['value'] : undefined;
    if (!expressions.length && typeof quasi?.['cooked'] === 'string') return quasi['cooked'];
  }
  return undefined;
}
function isAstNode(value: unknown): value is TAstNode {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

function generateTaggedRegistry(demoFiles: readonly TDemoFile[], includeTags: readonly string[], excludeTags: readonly string[]): string {
  return `
    ${demoFiles.map((_file, index) => `import * as demoModule${index} from ${JSON.stringify(getVirtualDemoModuleId(index))}`).join('\n')}
    ${demoFiles.map((_file, index) => `import demoSource${index} from ${JSON.stringify(getVirtualDemoSourceId(index))}`).join('\n')}
    ${demoFiles.map((_file, index) => `import demoSourceInfo${index} from ${JSON.stringify(getVirtualDemoSourceInfoId(index))}`).join('\n')}
    const includeTags = ${JSON.stringify(includeTags)}
    const excludeTags = ${JSON.stringify(excludeTags)}
    ${normalizerSource()}
    function matchesTags(demo) {
      const tags = Array.isArray(demo.tags) ? demo.tags : []
      if (excludeTags.some((tag) => tags.includes(tag))) return false
      return includeTags.length === 0 || includeTags.some((tag) => tags.includes(tag))
    }
    export const demos = [
      ${demoFiles.map((file, index) => `normalizeDemoDefinition(${JSON.stringify(file.filename)}, demoModule${index}, demoSource${index}, demoSourceInfo${index})`).join(',\n')}
    ].filter(matchesTags)
  `;
}

function getDemoTitle(filename: string): string {
  return filename.split('/').pop()?.replace(/\.demo\.ts$/, '') ?? filename;
}
export function getVirtualDemoModuleId(index: number): string { return `${virtualDemoModulePrefix}${index}`; }
export function getVirtualDemoSourceId(index: number): string { return `${virtualDemoSourcePrefix}${index}`; }
export function getVirtualDemoSourceInfoId(index: number): string { return `${virtualDemoSourceInfoPrefix}${index}`; }
