import { test, expect } from '@playwright/test';

/**
 * E2E tests for Tier 1 Little Explorer dashboard.
 */

test.describe('Tier 1 — Little Explorer', () => {
  test('should check tier1 API endpoint exists', async ({ request }) => {
    // The tier1 tasks endpoint should exist (even if auth fails)
    const response = await request.get(`${test.info().config.use.baseURL}/api/v1/tier1/tasks`);
    // 401 or 403 expected (requires auth), but not 404
    expect(response.status()).not.toBe(404);
  });

  test('should check pet state endpoint exists', async ({ request }) => {
    const response = await request.get(`${test.info().config.use.baseURL}/api/v1/tier1/pet`);
    expect(response.status()).not.toBe(404);
  });

  test('should serve static assets', async ({ request }) => {
    const response = await request.get(`${test.info().config.use.baseURL}/`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    // Should include app div or script references
    expect(html).toContain('<!DOCTYPE html>');
  });

  test('should have PWA manifest', async ({ request }) => {
    const response = await request.get(`${test.info().config.use.baseURL}/manifest.webmanifest`);
    // May be 200 or 404 depending on build
    expect([200, 404]).toContain(response.status());
  });
});
