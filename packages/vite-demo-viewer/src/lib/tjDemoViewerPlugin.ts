import * as path from 'node:path';
import type { OutputChunk } from 'rollup';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';

import {
  generateRegistry,
  readDemoSourceInfo,
  virtualDemoModulePrefix,
  virtualDemoSourceInfoPrefix,
  virtualDemoSourcePrefix,
} from './generateRegistry.ts';
import { resolveDemoOptions, type TDemoOptions } from './options.ts';
import { scanDemos, type TDemoFile } from './scanDemos.ts';
import { generateViewerHtml } from './tjDemoViewer-html.ts';
import { generateClient } from './tjDemoViewerClient-template.ts';

export type { TDemoOptions } from './options.ts';

const frontendImportPath = '@trunkjs/demo-viewer';
const virtualRegistryId = 'virtual:tdemo-registry';
const resolvedRegistryId = `\0${virtualRegistryId}`;
const virtualClientId = 'virtual:tdemo-client';
const resolvedClientId = `\0${virtualClientId}`;

export function tjDemoViewerPlugin(options: TDemoOptions = {}): Plugin[] {
  const resolvedOptions = resolveDemoOptions(options);

  let config: ResolvedConfig | undefined;
  let demoRoot = process.cwd();
  let demoFiles: TDemoFile[] = [];

  async function refreshDemos(): Promise<void> {
    demoFiles = await scanDemos(demoRoot, resolvedOptions.include, resolvedOptions.exclude);
  }

  function invalidateRegistry(server: ViteDevServer): void {
    const registryModule = server.moduleGraph.getModuleById(resolvedRegistryId);

    if (registryModule) server.moduleGraph.invalidateModule(registryModule);
    for (const index of demoFiles.keys()) {
      const sourceInfoModule = server.moduleGraph.getModuleById(`\0${virtualDemoSourceInfoPrefix}${index}`);
      if (sourceInfoModule) server.moduleGraph.invalidateModule(sourceInfoModule);
    }
  }

  async function reloadDemos(server: ViteDevServer): Promise<void> {
    await refreshDemos();
    invalidateRegistry(server);
    server.ws.send({ type: 'full-reload' });
  }

  const corePlugin: Plugin = {
    name: 'vite-plugin-tdemo:core',
    apply: (_config, environment) => environment.command === 'serve' || resolvedOptions.build,

    async configResolved(resolvedConfig) {
      config = resolvedConfig;
      demoRoot = path.resolve(resolvedConfig.root, options.root ?? '.');
      await refreshDemos();
    },

    async buildStart() {
      await refreshDemos();
    },

    resolveId(id) {
      if (id === virtualRegistryId) {
        return resolvedRegistryId;
      }

      if (id === virtualClientId || id === '/@tdemo/client') {
        return resolvedClientId;
      }

      if (id.startsWith(virtualDemoSourceInfoPrefix)) {
        const index = Number(id.slice(virtualDemoSourceInfoPrefix.length));
        return demoFiles[index] ? `\0${id}` : undefined;
      }

      if (id.startsWith(virtualDemoSourcePrefix)) {
        const index = Number(id.slice(virtualDemoSourcePrefix.length));
        const sourceFile = demoFiles[index];

        return sourceFile ? `${sourceFile.absolutePath}?raw` : undefined;
      }

      if (id.startsWith(virtualDemoModulePrefix)) {
        const index = Number(id.slice(virtualDemoModulePrefix.length));
        return demoFiles[index]?.absolutePath;
      }

      return undefined;
    },

    load(id) {
      if (id === resolvedRegistryId) {
        return generateRegistry(demoFiles, resolvedOptions.includeTags, resolvedOptions.excludeTags);
      }

      if (id === resolvedClientId) {
        return generateClient(frontendImportPath);
      }

      const sourceInfoId = id.startsWith(`\0${virtualDemoSourceInfoPrefix}`)
        ? id.slice(1)
        : undefined;
      if (sourceInfoId) {
        const index = Number(sourceInfoId.slice(virtualDemoSourceInfoPrefix.length));
        const file = demoFiles[index];
        if (file) return readDemoSourceInfo(file).then((sourceInfo) => `export default ${JSON.stringify(sourceInfo)}`);
      }

      return undefined;
    },
  };

  const servePlugin: Plugin = {
    name: 'vite-plugin-tdemo:serve',
    apply: 'serve',

    configureServer(server) {
      server.watcher.add(demoRoot);

      const reloadAddedOrRemovedDemo = (filename: string) => {
        if (isDemoFile(filename)) {
          void reloadDemos(server);
        }
      };

      server.watcher.on('add', reloadAddedOrRemovedDemo);
      server.watcher.on('unlink', reloadAddedOrRemovedDemo);

      server.middlewares.use(async (req, res, next) => {
        const pathname = stripBase((req.url ?? '').split('?')[0] ?? '', config?.base ?? '/');

        if (!isViewerRoute(pathname, resolvedOptions.route)) {
          return next();
        }

        const html = generateViewerHtml({
          title: resolvedOptions.title,
          clientEntry: joinBase(config?.base ?? '/', '@tdemo/client'),
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(await server.transformIndexHtml(pathname, html));
      });
    },

    async handleHotUpdate(context) {
      if (!isDemoFile(context.file)) {
        return undefined;
      }

      await reloadDemos(context.server);
      return [];
    },
  };

  const buildPlugin: Plugin = {
    name: 'vite-plugin-tdemo:build',
    apply: 'build',

    config() {
      if (!resolvedOptions.build) {
        return undefined;
      }

      return {
        build: {
          rollupOptions: {
            input: virtualClientId,
          },
        },
      };
    },

    generateBundle(_outputOptions, bundle) {
      if (!resolvedOptions.build) {
        return;
      }

      const clientChunk = Object.values(bundle).find(
        (entry): entry is OutputChunk =>
          entry.type === 'chunk' && entry.isEntry && entry.facadeModuleId === resolvedClientId,
      );

      if (!clientChunk) {
        this.error('Could not find the generated demo viewer client entry.');
      }

      const clientCssEntries = getChunkCssEntries(clientChunk).map((fileName) => joinBase(config?.base ?? '/', fileName));

      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: generateViewerHtml({
          title: resolvedOptions.title,
          clientEntry: joinBase(config?.base ?? '/', clientChunk.fileName),
          cssEntries: clientCssEntries,
        }),
      });
    },
  };

  return [corePlugin, servePlugin, buildPlugin];
}

function getChunkCssEntries(chunk: OutputChunk): string[] {
  const chunkWithMetadata = chunk as OutputChunk & { viteMetadata?: { importedCss?: Set<string> } };
  return Array.from(chunkWithMetadata.viteMetadata?.importedCss ?? []);
}

function isDemoFile(filename: string): boolean {
  return filename.endsWith('.demo.ts');
}

function isViewerRoute(pathname: string, route: string): boolean {
  if (route === '/') {
    return pathname === '/' || pathname === '/index.html';
  }

  return pathname === route || pathname === `${route}/` || pathname === `${route}/index.html`;
}

function stripBase(pathname: string, base: string): string {
  if (!base.startsWith('/') || base === '/') {
    return pathname;
  }

  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;

  if (pathname === normalizedBase) {
    return '/';
  }

  if (pathname.startsWith(`${normalizedBase}/`)) {
    return pathname.slice(normalizedBase.length);
  }

  return pathname;
}

function joinBase(base: string, filename: string): string {
  const normalizedFilename = filename.replace(/^\/+/, '');

  if (base === '' || base === './') {
    return `./${normalizedFilename}`;
  }

  return `${base.endsWith('/') ? base : `${base}/`}${normalizedFilename}`;
}
