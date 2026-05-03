// Custom Next.js server: boots Next, starts the HTTP listener, then kicks off
// the in-process poller so /api/servers and /api/members have data to serve.
// See plan — Phase 1: "server.ts custom server that boots Next and calls poller.start()".

// MUST be first: loads .env into process.env before poller's defaultPoller reads it.
import './env';

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
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

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
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
