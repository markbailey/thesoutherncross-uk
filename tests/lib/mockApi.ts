// Playwright route handlers that intercept /api/* calls and serve fixture JSON.
// Usage:
//   test.beforeEach(async ({ page }) => { await mockApi(page); });

import type { Page } from '@playwright/test';
import membersFixture from './fixtures/members.json' with { type: 'json' };
import serversFixture from './fixtures/servers.json' with { type: 'json' };

export type MockApiOptions = {
  members?: unknown;
  servers?: unknown;
  membersStatus?: number;
  serversStatus?: number;
};

export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<void> {
  await page.route('**/api/members', (route) => {
    route.fulfill({
      status: options.membersStatus ?? 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(options.members ?? membersFixture),
    });
  });
  await page.route('**/api/servers', (route) => {
    route.fulfill({
      status: options.serversStatus ?? 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(options.servers ?? serversFixture),
    });
  });
  // /api/health always OK under test — the webServer gate in playwright.config.ts
  // already waits for the real endpoint, so this is belt-and-braces for screenshots.
  await page.route('**/api/health', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, uptimeMs: 1000, lastPollAt: Date.now(), dbOk: true }),
    });
  });
}
