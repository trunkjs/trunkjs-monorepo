import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { generateRegistry, readDemoSourceInfo } from './generateRegistry';

const directories: string[] = [];

async function demoFile(source: string, files: Record<string, string> = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'demo-source-info-'));
  directories.push(directory);
  const absolutePath = join(directory, 'example.demo.ts');
  await Promise.all([
    writeFile(absolutePath, source),
    ...Object.entries(files).map(([filename, content]) => writeFile(join(directory, filename), content)),
  ]);
  return { absolutePath, filename: 'example.demo.ts' };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('demo source extraction', () => {
  it('extracts method, arrow, and expression function bodies', async () => {
    const method = await readDemoSourceInfo(await demoFile(`defineDemo({ render(root) { root.textContent = 'method'; } })`));
    const arrow = await readDemoSourceInfo(await demoFile(`defineDemo({ render: (root) => { root.textContent = 'arrow'; } })`));
    const expression = await readDemoSourceInfo(await demoFile(`defineDemo({ render: root => root.append(document.createElement('hr')) })`));

    expect(method.example?.code).toContain("root.textContent = \"method\"");
    expect(arrow.example?.code).toContain("root.textContent = \"arrow\"");
    expect(expression.example?.code).toContain("root.append(document.createElement(\"hr\"))");
    expect(method.example?.code.trim().startsWith('render')).toBe(false);
  });

  it('extracts multiple handlers, nested paths, ids, and inspectable references', async () => {
    const info = await readDemoSourceInfo(await demoFile(`
      import { defineDemo, inspectable } from '@trunkjs/demo-viewer';
      const reusable = inspectable((_, env) => { env.toast.show('reused'); });
      export default defineDemo({
        actionBar: { items: [
          { id: 'open', type: 'button', onClick(_, env) { env.toast.show('open'); } },
          { type: 'json', validate: value => Array.isArray(value), onApply(event, env) { env.toast.log(event.value); } },
          { type: 'group', items: [{ type: 'button', onClick: reusable }] }
        ] }
      });
    `));

    expect(info.controls?.['open']?.onClick?.code).toContain('env.toast.show');
    expect(info.controls?.['1']?.validate?.code).toContain('Array.isArray(value)');
    expect(info.controls?.['1']?.onApply?.code).toContain('env.toast.log');
    expect(info.controls?.['2.0']?.onClick?.code).toContain('reused');
  });

  it('includes imported SCSS entry files as inspectable source', async () => {
    const info = await readDemoSourceInfo(await demoFile(`
      import styleUrl from './example.scss?url';
      import inlineStyle from './extra.scss?inline';
      defineDemo({ css: [styleUrl, inlineStyle], html: '<p>Demo</p>' });
    `, {
      'example.scss': '$color: red;\n.demo { color: $color; }',
      'extra.scss': '.extra { display: grid; }',
    }));

    expect(info.styles).toEqual([
      { code: '$color: red;\n.demo { color: $color; }', language: 'scss', label: 'example.scss' },
      { code: '.extra { display: grid; }', language: 'scss', label: 'extra.scss' },
    ]);
  });

  it('keeps source-info imports lazy in the untagged registry', async () => {
    const file = await demoFile(`defineDemo({ render(root) { root.textContent = 'lazy'; } })`);
    const registry = await generateRegistry([file], [], []);

    expect(registry).toContain('import("virtual:tdemo-source-info:0")');
    expect(registry).toContain('load: () => Promise.all');
    expect(registry).not.toContain('root.textContent =');
  });
});
