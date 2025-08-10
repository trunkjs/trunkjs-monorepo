import * as path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, '.'), // your frontend root
  base: '.', // base path for assets, adjust as needed

  resolve: {
    alias: {
      '@': path.resolve(__dirname, ''),
      '@shared': path.resolve(__dirname, '../packages'), // monorepo shared types
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist/client'),
    emptyOutDir: true,
  },
});
