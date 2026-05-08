import { fileURLToPath } from 'node:url';

const BREAKING_SUBJECT_REGEX = /^[a-zA-Z]+(\(.+\))?!:/m;
const FEAT_SUBJECT_REGEX = /^feat(\(.+\))?:/m;

export function detectBumpType(message) {
  if (BREAKING_SUBJECT_REGEX.test(message) || message.includes('BREAKING CHANGE:')) {
    return 'major';
  }

  if (FEAT_SUBJECT_REGEX.test(message)) {
    return 'minor';
  }

  return 'patch';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(detectBumpType(process.env.COMMIT_MESSAGE ?? ''));
}
