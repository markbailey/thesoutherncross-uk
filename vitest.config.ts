import { defineConfig } from 'vitest/config';

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
    },
  },
});
