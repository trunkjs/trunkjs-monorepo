import fg from 'fast-glob';
import * as path from 'node:path';

export type TDemoFile = {
  absolutePath: string;
  filename: string;
};

export async function scanDemos(
  root: string,
  include: readonly string[],
  exclude: readonly string[],
): Promise<TDemoFile[]> {
  const files = await fg([...include], {
    absolute: true,
    cwd: root,
    ignore: [...exclude],
    onlyFiles: true,
  });

  return files
    .map((absolutePath) => ({
      absolutePath: path.normalize(absolutePath),
      filename: normalizePath(path.relative(root, absolutePath)),
    }))
    .sort((left, right) => left.filename.localeCompare(right.filename));
}

function normalizePath(filename: string): string {
  return filename.split(path.sep).join('/');
}
