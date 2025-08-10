import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type ClassInfo = {
  exportName: string;
  className: string;
  ctor: new (...args: any[]) => any;
};

const IGNORED_DIRS = new Set(['node_modules', 'dist', '.git']);

const isClass = (v: unknown): v is new (...a: any[]) => any =>
  typeof v === 'function' && /^class\s/.test(Function.prototype.toString.call(v));

function globToRegExp(glob: string): RegExp {
  // normalize and escape regex specials except * ?
  let s = glob.replace(/\\/g, '/').replace(/([.+^${}()|[\]\\])/g, '\\$1');
  // ** => any path, * => segment, ? => single char
  s = s.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${s}$`);
}

// usage examples:
// await autoloadClass('src', '**/*.ts')
// await autoloadClass('src', /features\/.*\.ts$/)
// await autoloadClass('src', '*.ts', false)
export async function autoImportClasses(
  basedir: string,
  pattern: RegExp | string,
  recursive = true,
): Promise<ClassInfo[]> {
  const root = path.resolve(basedir);
  const rx = typeof pattern === 'string' ? globToRegExp(pattern) : pattern;
  const out: ClassInfo[] = [];

  async function* walk(dir: string): AsyncGenerator<string> {
    for (const d of await readdir(dir, { withFileTypes: true })) {
      if (d.isDirectory()) {
        if (!recursive || IGNORED_DIRS.has(d.name)) continue;
        yield* walk(path.join(dir, d.name));
      } else if (d.isFile()) {
        const abs = path.join(dir, d.name);
        const rel = path.relative(root, abs).split(path.sep).join('/');
        if (rel.endsWith('.d.ts')) continue;
        if (rx.test(rel)) {
          yield abs;
        }
      }
    }
  }

  for await (const file of walk(root)) {
    console.log('autoImportClasses: importing file:', file);
    const mod = await import(pathToFileURL(file).href);
    console.log('autoImportClasses: imported module:', mod);
    for (const [exportName, value] of Object.entries(mod)) {
      if (isClass(value)) out.push({ exportName, className: (value as Function).name, ctor: value as any });
    }
  }

  out.sort((a, b) => (a.className + a.exportName).localeCompare(b.className + b.exportName));
  return out;
}
