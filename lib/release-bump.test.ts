import { describe, expect, it } from 'vitest';

import { detectBumpType } from '../scripts/detect-bump.mjs';

describe('detectBumpType', () => {
  describe('major (breaking)', () => {
    it.each([
      ['feat!: drop legacy endpoint'],
      ['fix!: change return shape'],
      ['feat(api)!: change endpoint'],
      ['refactor(core)!: rename module'],
    ])('subject "%s" → major', (subject) => {
      expect(detectBumpType(subject)).toBe('major');
    });

    it('returns major for BREAKING CHANGE: footer in body', () => {
      const message = 'feat: update payload\n\nBREAKING CHANGE: response shape changed';
      expect(detectBumpType(message)).toBe('major');
    });

    it('returns major for BREAKING-CHANGE: alternate spelling', () => {
      const message = 'feat: update payload\n\nBREAKING-CHANGE: response shape changed';
      expect(detectBumpType(message)).toBe('major');
    });

    it('handles CRLF line endings', () => {
      const message = 'feat: update payload\r\n\r\nBREAKING CHANGE: shape changed';
      expect(detectBumpType(message)).toBe('major');
    });
  });

  describe('minor (feat)', () => {
    it('returns minor for bare feat subject', () => {
      expect(detectBumpType('feat: add release badge')).toBe('minor');
    });

    it('returns minor for scoped feat subject', () => {
      expect(detectBumpType('feat(ui): add release badge')).toBe('minor');
    });
  });

  describe('patch (default)', () => {
    it.each([
      ['fix: handle null cache value'],
      ['chore: bump deps'],
      ['docs: update runbook'],
      ['refactor: rename helper'],
      ['perf: cache lookups'],
      ['test: add coverage'],
      ['wip thing without conventional prefix'],
    ])('subject "%s" → patch', (subject) => {
      expect(detectBumpType(subject)).toBe('patch');
    });

    it('returns patch for empty string', () => {
      expect(detectBumpType('')).toBe('patch');
    });

    it('returns patch for whitespace-only message', () => {
      expect(detectBumpType('   \n\n  ')).toBe('patch');
    });
  });

  describe('false-positive guards', () => {
    it('does not match BREAKING CHANGE: text inside subject prose', () => {
      // Per spec, breaking is signalled by `!` in subject or footer line in body.
      // Subject prose mentioning "BREAKING CHANGE:" alone must NOT trigger major.
      expect(detectBumpType('feat: discuss BREAKING CHANGE: but no actual change')).toBe(
        'minor',
      );
    });

    it('only evaluates first line for feat subject markers', () => {
      const message = 'docs: update runbook\n\nfeat(ui): mention release badges';
      expect(detectBumpType(message)).toBe('patch');
    });
  });
});
