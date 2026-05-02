// Pino logger with daily rotating file transport via pino-roll.
// In test env we write to a silent destination so vitest doesn't spam logs/.

import pino, { type Logger } from 'pino';

const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';
const isTest = process.env['NODE_ENV'] === 'test';

function createLogger(): Logger {
  if (isTest) {
    return pino({ level: 'silent' });
  }

  const transport = pino.transport({
    target: 'pino-roll',
    options: {
      file: 'logs/app.log',
      frequency: 'daily',
      mkdir: true,
      size: '20m',
    },
  });

  return pino({ level: LOG_LEVEL }, transport);
}

export const logger: Logger = createLogger();

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
