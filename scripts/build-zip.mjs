import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root       = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tar        = 'C:\\Windows\\System32\\tar.exe';
const standalone = resolve(root, '.next', 'standalone');
const outPath    = process.argv[2] ?? resolve(root, 'deploy.zip');

if (!existsSync(tar)) {
  console.error(`ERROR: tar not found at ${tar}`);
  process.exit(1);
}

if (!existsSync(standalone)) {
  console.error('ERROR: .next/standalone not found — run `npm run build` first.');
  process.exit(1);
}

console.log('==> Compiling TypeScript (tsconfig.server.json)');
const tscBin = resolve(root, 'node_modules', 'typescript', 'bin', 'tsc');
execFileSync(process.execPath, [tscBin, '-p', resolve(root, 'tsconfig.server.json')], {
  cwd: root,
  stdio: 'inherit',
});

console.log('==> Patching ESM import extensions');
function patchImports(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      patchImports(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const src = readFileSync(full, 'utf8');
      const patched = src.replace(
        /(\b(?:from|import)\s+)(["'])(\.\.?\/[^"']+)\2/g,
        (match, keyword, quote, importPath) => {
          if (extname(importPath)) return match;
          return `${keyword}${quote}${importPath}.js${quote}`;
        }
      );
      if (patched !== src) writeFileSync(full, patched, 'utf8');
    }
  }
}
patchImports(standalone);

console.log('==> Copying .next/static/');
const staticSrc = resolve(root, '.next', 'static');
const staticDst = resolve(standalone, '.next', 'static');
if (existsSync(staticSrc)) {
  if (existsSync(staticDst)) rmSync(staticDst, { recursive: true, force: true });
  cpSync(staticSrc, staticDst, { recursive: true });
}

console.log('==> Copying public/');
const publicSrc = resolve(root, 'public');
const publicDst = resolve(standalone, 'public');
if (existsSync(publicSrc)) {
  if (existsSync(publicDst)) rmSync(publicDst, { recursive: true, force: true });
  cpSync(publicSrc, publicDst, { recursive: true });
}

const ts      = Date.now();
const staging = join(tmpdir(), `thesoutherncross-staging-${ts}`);
console.log(`==> Staging to ${staging}`);
if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

cpSync(standalone, staging, { recursive: true });

for (const item of ['scripts', 'web.config', '.env.example', 'data']) {
  const src = resolve(root, item);
  if (existsSync(src)) cpSync(src, join(staging, item), { recursive: true });
}

if (existsSync(outPath)) unlinkSync(outPath);
console.log(`==> Building deploy.zip\n    Root:   ${staging}\n    Output: ${outPath}`);
try {
  execFileSync(tar, [
    '-acf', outPath,
    '-C', staging,
    '--exclude', '*.sqlite',
    '--exclude', '*.sqlite-*',
    '--exclude', '*.tsbuildinfo',
    '--exclude', 'scripts/build-zip.mjs',
    '.',
  ], { stdio: 'inherit' });
} finally {
  rmSync(staging, { recursive: true, force: true });
}

const sizeMb = (statSync(outPath).size / 1024 / 1024).toFixed(1);
console.log(`    Done: ${sizeMb} MB  ->  ${outPath}`);
