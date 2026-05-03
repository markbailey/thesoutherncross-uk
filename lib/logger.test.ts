import { describe, it, expect } from 'vitest';
import { logger, childLogger } from './logger';

describe('logger', () => {
  it('exports a pino-like logger with expected levels', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('is silent in test env (no throw, no output)', () => {
    // If this throws it surfaces in the test run; pino silent level swallows output.
    expect(() => {
      logger.info({ ping: 'pong' }, 'hello');
      logger.error({ err: new Error('nope') }, 'boom');
    }).not.toThrow();
  });

  it('childLogger returns a child with extra bindings', () => {
    const child = childLogger({ component: 'test' });
    expect(typeof child.info).toBe('function');
    // pino children are distinct instances
    expect(child).not.toBe(logger);
  });
});
