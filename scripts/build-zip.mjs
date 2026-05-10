import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const output = 'deploy.zip';

const excludePaths = [
  '.git',
  '.next',
  'coverage',
  'data',
  'deploy.zip',
  'logs',
  'node_modules',
  'playwright-report',
  'test-results',
  'tests',
];

if (existsSync(output)) rmSync(output);

if (process.platform === 'win32') {
  // bsdtar (System32\tar.exe on Win10+) supports zip output via `-a` extension autodetect.
  const tarBin = `${process.env.SystemRoot ?? 'C:\\Windows'}\\System32\\tar.exe`;
  const args = ['-a', '-c', '-f', output];
  for (const path of excludePaths) args.push(`--exclude=./${path}`);
  args.push('.');
  execFileSync(tarBin, args, { stdio: 'inherit' });
} else {
  // GNU tar does NOT produce zip from `-a`; ubuntu-latest runners ship `zip` preinstalled.
  const args = ['-rq', output, '.'];
  for (const path of excludePaths) {
    args.push('-x', `./${path}/*`, `./${path}`);
  }
  execFileSync('zip', args, { stdio: 'inherit' });
}
