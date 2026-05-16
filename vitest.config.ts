import { defineConfig } from 'vitest/config';

// DB convention: tests touching `lib/db` reset the singleton in
// beforeEach via `closeDb()` + `getDb({ dbPath: ':memory:' })`. Vitest
// isolates by file (default), so the reset is safe within a file but
// any test that imports `lib/db` MUST follow this pattern — otherwise
// it will read a yanked handle once another DB-using test runs first.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'tests/e2e/**', 'tests/visual/**'],
    globals: false,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      // Thresholds set ~5pt below current baseline (stmts 70/branch 78/func 77/lines 70)
      // so a meaningful regression fails CI but today's coverage stays green.
      // Raise these as coverage improves.
      thresholds: {
        statements: 65,
        branches: 70,
        functions: 70,
        lines: 65,
      },
    },
  },
});
