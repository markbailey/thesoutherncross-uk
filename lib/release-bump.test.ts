import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(new URL('../scripts/detect-bump.mjs', import.meta.url));

function detectBumpType(message: string): string {
  return execFileSync('node', [scriptPath], {
    env: { ...process.env, COMMIT_MESSAGE: message },
    encoding: 'utf8',
  }).trim();
}

describe('detect-bump script', () => {
  it('returns major for breaking subject suffix', () => {
    expect(detectBumpType('feat(api)!: change endpoint')).toBe('major');
  });

  it('returns major for BREAKING CHANGE in body', () => {
    const message = `feat: update payload

BREAKING CHANGE: response shape changed`;
    expect(detectBumpType(message)).toBe('major');
  });

  it('returns minor for feat commits', () => {
    expect(detectBumpType('feat(ui): add release badge')).toBe('minor');
  });

  it('returns patch for all non-feat and non-breaking commits', () => {
    expect(detectBumpType('fix: handle null cache value')).toBe('patch');
  });

  it('only evaluates the first line for feat/breaking subject markers', () => {
    const message = `docs: update runbook

feat(ui): mention release badges`;
    expect(detectBumpType(message)).toBe('patch');
  });
});
