import { execFileSync } from 'child_process';
import { existsSync, unlinkSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root    = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tar     = 'C:\\Windows\\System32\\tar.exe';
const outPath = process.argv[2] ?? resolve(root, 'deploy.zip');

const items = [
  'app', 'components', 'config', 'lib', 'public', 'scripts', 'types', 'data',
  'env.ts', 'middleware.ts', 'next-env.d.ts', 'server.ts',
  'next.config.ts', 'package.json', 'package-lock.json',
  'postcss.config.mjs', 'tailwind.config.ts', 'tsconfig.json',
  'vitest.config.ts', 'playwright.config.ts',
  'web.config', '.env.example', '.gitignore', '.gitattributes',
];

const present = items.filter(i => existsSync(resolve(root, i)));
const missing = items.filter(i => !existsSync(resolve(root, i)));
if (missing.length) console.log(`    (skipping missing: ${missing.join(', ')})`);

if (existsSync(outPath)) unlinkSync(outPath);

console.log(`==> Building deploy.zip\n    Root:   ${root}\n    Output: ${outPath}`);

execFileSync(tar, [
  '-acf', outPath,
  '-C',   root,
  '--exclude', '*.sqlite',
  '--exclude', '*.sqlite-*',
  '--exclude', '*.tsbuildinfo',
  ...present,
], { stdio: 'inherit' });

const sizeMb = (statSync(outPath).size / 1024 / 1024).toFixed(1);
console.log(`    Done: ${sizeMb} MB  ->  ${outPath}`);
