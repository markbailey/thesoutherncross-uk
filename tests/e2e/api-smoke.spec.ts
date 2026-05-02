import { expect, test } from '@playwright/test';

test.describe('api smoke', () => {
  test('/api/health responds', async ({ request }) => {
    const res = await request.get('/api/health');
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('uptimeMs');
    expect(body).toHaveProperty('dbOk');
  });

  test('/api/servers returns {games, updatedAt}', async ({ request }) => {
    const res = await request.get('/api/servers');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('games');
    expect(Array.isArray(body.games)).toBe(true);
    expect(body).toHaveProperty('updatedAt');
  });

  test('/api/members returns {members, stale, updatedAt}', async ({ request }) => {
    const res = await request.get('/api/members');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('members');
    expect(Array.isArray(body.members)).toBe(true);
    expect(body).toHaveProperty('stale');
    expect(body).toHaveProperty('updatedAt');
  });

  test('/api/refresh without secret returns 401 or 503', async ({ request }) => {
    const res = await request.get('/api/refresh');
    expect([401, 503]).toContain(res.status());
  });
});
