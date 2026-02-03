import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ReflectionGenerator } from '../index';

/**
 * Demo: runs the reflector on some on-disk TypeScript source and prints the stored schema.
 *
 * Run:
 *   nx run reflector:demo
 */
function main() {
  const gen = new ReflectionGenerator({
    // keep it self-contained and fast
    useSysHost: false,
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const sourcePath = path.join(__dirname, 'demo-source.ts');

  const results = gen.addSourceFilesAtPaths(sourcePath);

  const payload = {
    results,
    stored: gen.getAll(),
  };

  console.log(JSON.stringify(payload, null, 2));
}

main();
