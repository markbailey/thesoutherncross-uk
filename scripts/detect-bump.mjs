import { fileURLToPath } from 'node:url';

const BREAKING_SUBJECT_REGEX = /^[a-zA-Z]+(\(.+\))?!:/;
const FEAT_SUBJECT_REGEX = /^feat(\(.+\))?:/;

export function detectBumpType(message) {
  const subject = message.split(/\r?\n/, 1)[0] ?? '';

  if (BREAKING_SUBJECT_REGEX.test(subject) || message.includes('BREAKING CHANGE:')) {
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
