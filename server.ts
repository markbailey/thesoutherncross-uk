// Custom Next.js server: boots Next, starts the HTTP listener, then kicks off
// the in-process poller so /api/servers and /api/members have data to serve.
// See plan — Phase 1: "server.ts custom server that boots Next and calls poller.start()".

// MUST be first: loads .env into process.env before poller's defaultPoller reads it.
import './env';

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import next from 'next';
import { closeDb } from './lib/db';
import { logger } from './lib/logger';
import * as poller from './lib/poller';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (!dev) {
      const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;
      let filePath = '';
      if (pathname.startsWith('/_next/static/')) {
        filePath = join(process.cwd(), '.next', 'static', pathname.replace('/_next/static/', ''));
      } else if (pathname !== '/' && !pathname.startsWith('/api/')) {
        filePath = join(process.cwd(), 'public', pathname);
      }
      
      if (filePath) {
        try {
          const stats = await stat(filePath);
          if (stats.isFile()) {
            const ext = filePath.split('.').pop()?.toLowerCase() || '';
            const mimeTypes: Record<string, string> = { css: 'text/css', js: 'application/javascript', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', ico: 'image/x-icon', mp3: 'audio/mpeg', json: 'application/json', woff2: 'font/woff2' };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            if (pathname.startsWith('/_next/static/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            createReadStream(filePath).pipe(res);
            return;
          }
        } catch (e) {}
      }
    }

    handle(req, res).catch((err: unknown) => {
      logger.error({ err, url: req.url }, 'request handler crashed');
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('internal error');
      }
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, hostname, () => {
      console.log(`\n  ▲ Next.js (custom server)`);
      console.log(`  - Local:        http://${hostname}:${port}\n`);
      logger.info({ hostname, port, dev }, 'server listening');
      resolve();
    });
  });

  poller.start();

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'shutdown requested');
    const timeout = setTimeout(() => {
      logger.warn('shutdown timed out; forcing exit');
      process.exit(1);
    }, 5000);
    timeout.unref();

    try {
      poller.stop();
    } catch (err) {
      logger.error({ err }, 'poller.stop threw');
    }

    server.close((err) => {
      if (err) logger.error({ err }, 'server.close threw');
      try {
        closeDb();
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'closeDb threw');
      }
      clearTimeout(timeout);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  logger.error({ err }, 'server failed to start');
  process.exit(1);
});
