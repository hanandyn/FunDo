import { test, expect } from '@playwright/test';

/**
 * E2E tests for tasks and quest board.
 */

test.describe('Tasks', () => {
  test('should show login page before accessing tasks', async ({ page }) => {
    await page.goto('/');
    // Unauthenticated users should see login
    await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 10000 });
  });

  test('should load API health endpoint successfully', async ({ request }) => {
    const response = await request.get(`${test.info().config.use.baseURL}/api/v1/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBeDefined();
  });

  test('should return proper CORS headers', async ({ request }) => {
    const response = await request.get(`${test.info().config.use.baseURL}/api/v1/health`, {
      headers: { 'Origin': 'https://fundo.dayan.casa' },
    });
    // CORS headers should be present
    const headers = response.headers();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });

  test('should handle 404 for non-existent task', async ({ request }) => {
    const response = await request.get(`${test.info().config.use.baseURL}/api/v1/tasks/instances/999999`);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
