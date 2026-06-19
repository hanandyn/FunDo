import { test, expect } from '@playwright/test';

/**
 * E2E tests for rewards shop.
 */

test.describe('Rewards', () => {
  test('should require authentication for rewards API', async ({ request }) => {
    const response = await request.get(`${test.info().config.use.baseURL}/api/v1/rewards/list`);
    // Should be 401 or 403 (auth required)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should return proper error for unauthenticated redemptions', async ({ request }) => {
    const response = await request.post(`${test.info().config.use.baseURL}/api/v1/rewards/redeem`, {
      data: { reward_id: 1 },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should get health endpoint version', async ({ request }) => {
    const response = await request.get(`${test.info().config.use.baseURL}/api/v1/health`);
    const data = await response.json();
    expect(data.version).toBe('0.10.0');
  });
});
