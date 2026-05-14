import { fileURLToPath } from 'node:url';

const BREAKING_SUBJECT_REGEX = /^[a-zA-Z]+(\([^)]+\))?!:/;
const FEAT_SUBJECT_REGEX = /^feat(\([^)]+\))?:/;
// Conventional Commits footer must start a line. `BREAKING-CHANGE` is also valid per spec.
const BREAKING_FOOTER_REGEX = /^BREAKING[ -]CHANGE: /m;

/**
 * @param {string} message
 * @returns {'major' | 'minor' | 'patch'}
 */
export function detectBumpType(message) {
  const normalized = message ?? '';
  const subject = normalized.split(/\r?\n/, 1)[0] ?? '';
  const body = normalized.slice(subject.length);

  if (BREAKING_SUBJECT_REGEX.test(subject) || BREAKING_FOOTER_REGEX.test(body)) {
    return 'major';
  }

  if (FEAT_SUBJECT_REGEX.test(subject)) {
    return 'minor';
  }

  return 'patch';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(detectBumpType(process.env.COMMIT_MESSAGE ?? ''));
}
