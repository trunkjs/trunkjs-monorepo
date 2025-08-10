import express from 'express';
import * as http from 'node:http';
import * as path from 'path';
import { createServer as createViteServer } from 'vite';
import { autoImportClasses } from '../src/lib/Autoloader/autoImportClasses.js';

async function start() {
  const app = express();

  const httpServer = http.createServer(app);

  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        server: httpServer,
      },
    },
    root: path.resolve(import.meta.dirname, 'apps/web'),
    base: './',
  });

  // use vite's connect instance as middleware
  app.use(vite.middlewares);

  httpServer.listen(4000, () => {
    console.log('http://localhost:4000');
  });
}

console.log('autoimport', await autoImportClasses(import.meta.dirname + '/apps/api', '**/*.ctrl.ts'));

start();
