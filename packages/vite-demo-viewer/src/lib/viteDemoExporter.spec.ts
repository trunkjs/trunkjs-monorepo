// @vitest-environment node

import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { viteDemoExporter } from './viteDemoExporter';

describe('viteDemoExporter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('creates a static demo viewer bundle', async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'vite-demo-exporter-test-'));
    tempDirs.push(outDir);

    const exporter = new viteDemoExporter(outDir, {
      include: [
        'packages/vite-demo-viewer/demo/hello-world.demo.ts',
        'packages/vite-demo-viewer/demo/markdown.demo.ts',
      ],
      title: 'Static Demo Export',
    });

    await exporter.build();

    const files = await readdir(outDir);
    expect(files).toContain('index.html');
    expect(files).toContain('index.js');

    const html = await readFile(path.join(outDir, 'index.html'), 'utf8');
    expect(html).toContain('<script type="module" crossorigin src="/index.js"></script>');

    const js = await readFile(path.join(outDir, 'index.js'), 'utf8');
    expect(js).toContain('tj-demo-viewer');
    expect(js).toContain('Markdown Demo');
  });
});
