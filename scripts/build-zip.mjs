import { execFileSync } from 'node:child_process';

import { createWriteStream } from 'node:fs';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root       = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const standalone = resolve(root, '.next', 'standalone');
const outPath    = process.argv[2] ?? resolve(root, 'deploy.zip');

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

console.log('==> Injecting custom poller and require patch into Next.js server.js');
const serverJsPath = resolve(standalone, 'server.js');
let serverJs = readFileSync(serverJsPath, 'utf8');

const requirePatch = `
// --- Turbopack Native Module Patch ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (typeof id === 'string' && id.startsWith('better-sqlite3-')) {
    return originalRequire.call(this, 'better-sqlite3');
  }
  return originalRequire.apply(this, arguments);
};
`;

serverJs = requirePatch + serverJs + `\n\n// --- Custom Background Poller ---\ntry {\n  console.log('Starting custom background poller...');\n  require('./env.js');\n  require('./lib/poller.js').start();\n} catch(err) {\n  console.error('Failed to start poller:', err);\n}\n`;
writeFileSync(serverJsPath, serverJs, 'utf8');

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

console.log('==> Fixing broken standalone dependencies');
for (const pkg of ['pino', 'pino-roll', 'thread-stream', 'fast-xml-parser', 'gamedig', 'better-sqlite3']) {
  const pkgSrc = resolve(root, 'node_modules', pkg);
  const pkgDst = resolve(standalone, 'node_modules', pkg);
  if (existsSync(pkgSrc)) {
    if (existsSync(pkgDst)) rmSync(pkgDst, { recursive: true, force: true });
    cpSync(pkgSrc, pkgDst, { recursive: true });
  }
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
// Clean ignored files
const dataDir = join(staging, 'data');
if (existsSync(dataDir)) {
  for (const f of readdirSync(dataDir)) {
    if (f.endsWith('.sqlite') || f.includes('.sqlite-')) rmSync(join(dataDir, f));
  }
}
const buildZipScript = join(staging, 'scripts', 'build-zip.mjs');
if (existsSync(buildZipScript)) rmSync(buildZipScript);

// Remove NFT-traced better-sqlite3 so it uses the root one (which can be rebuilt for the target OS)
const nextNodeModules = join(staging, '.next', 'node_modules');
if (existsSync(nextNodeModules)) {
  for (const f of readdirSync(nextNodeModules)) {
    if (f.startsWith('better-sqlite3')) rmSync(join(nextNodeModules, f), { recursive: true, force: true });
  }
}

// Remove Next.js auto-bundled .env files so we don't overwrite production config
const stagingEnv = join(staging, '.env');
if (existsSync(stagingEnv)) rmSync(stagingEnv);
const stagingEnvLocal = join(staging, '.env.local');
if (existsSync(stagingEnvLocal)) rmSync(stagingEnvLocal);
const stagingEnvProd = join(staging, '.env.production');
if (existsSync(stagingEnvProd)) rmSync(stagingEnvProd);

if (process.platform === 'win32') {
  execFileSync('cmd', ['/c', 'npx', '--yes', 'bestzip', outPath, '*', '.next', '.env.example'], { cwd: staging, stdio: 'inherit' });
} else {
  execFileSync('npx', ['--yes', 'bestzip', outPath, '*', '.next', '.env.example'], { cwd: staging, stdio: 'inherit' });
}
rmSync(staging, { recursive: true, force: true });

const sizeMb = (statSync(outPath).size / 1024 / 1024).toFixed(1);
console.log(`    Done: ${sizeMb} MB  ->  ${outPath}`);
