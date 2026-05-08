import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const tar = process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'tar';
const output = 'deploy.zip';
const excludes = [
  '--exclude=.git',
  '--exclude=.next',
  '--exclude=coverage',
  '--exclude=data',
  '--exclude=deploy.zip',
  '--exclude=logs',
  '--exclude=node_modules',
  '--exclude=playwright-report',
  '--exclude=test-results',
  '--exclude=tests',
];

if (existsSync(output)) {
  rmSync(output);
}

execFileSync(tar, ['-a', '-c', '-f', output, ...excludes, '.'], { stdio: 'inherit' });
