import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '3000';
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.05, threshold: 0.15 },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // Enable software WebGL so <Scene> mounts in headless CI.
        // --use-gl=swiftshader: legacy switch still honoured by Playwright's bundled chromium.
        // --enable-unsafe-swiftshader: required since Chromium 120; without it swiftshader is treated as unsafe-fallback only.
        launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
    {
      name: 'chromium-mobile',
      testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],
      grepInvert: /@desktop-only/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_TEST_MODE: '1',
      SESSION_SECRET:
        process.env.SESSION_SECRET ?? 'e2e-test-only-not-for-production-use-0000',
    },
  },
});
