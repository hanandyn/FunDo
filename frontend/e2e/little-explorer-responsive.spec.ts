import { test, expect } from '@playwright/test';

const kidUser = {
  id: 101,
  username: 'little-kid',
  display_name: 'A Very Happy Kid',
  role: 'child',
  family_id: 1,
  age_tier: 2,
  level: 4,
  xp: 120,
  stars: 85,
  gems: 6,
  current_streak: 5,
  longest_streak: 8,
  freeze_tokens: 0,
  handicap_multiplier: 1,
};

const tasks = {
  tasks: [
    { id: 1, template_id: 1, icon: '🪥', audio_prompt: 'Brush teeth', category: 'hygiene', status: 'pending', task_type: 'daily', points: 10 },
    { id: 2, template_id: 2, icon: '👕', audio_prompt: 'Get dressed', category: 'self-care', status: 'pending', task_type: 'daily', points: 12 },
    { id: 3, template_id: 3, icon: '📚', audio_prompt: 'Read together', category: 'reading', status: 'pending', task_type: 'daily', points: 15 },
    { id: 4, template_id: 4, icon: '🧸', audio_prompt: 'Put toys away', category: 'chores', status: 'pending', task_type: 'daily', points: 8 },
  ],
  total_pending: 4,
  child_name: kidUser.display_name,
  stars: kidUser.stars,
  gems: kidUser.gems,
  level: kidUser.level,
};

const petState = {
  pet: { stage: 'fox cub', emoji: '🦊', mood: 'happy', expression: '😊' },
  stats: { level: 4, stars: 85, gems: 6, streak: 5, tasks_completed_today: 2 },
  stickers: [{ icon: '🌟', name: 'Morning star' }],
  world_brightness: 0.72,
};

const messages = [
  {
    id: 1,
    family_id: 1,
    sender_id: 1,
    sender_name: 'Mom',
    message: 'Good morning! Have fun with your tasks.',
    type: 'announcement',
    pinned: false,
    created_at: new Date('2026-06-25T06:00:00Z').toISOString(),
  },
];

test.describe('Little Explorer mobile layout', () => {
  test.use({ serviceWorkers: 'block' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });

    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (!path.includes('/api/v1/')) return route.continue();
      if (path.endsWith('/auth/me')) return route.fulfill({ json: kidUser });
      if (path.endsWith('/tier1/tasks')) return route.fulfill({ json: tasks });
      if (path.endsWith('/tier1/pet-state')) return route.fulfill({ json: petState });
      if (path.endsWith('/family/messages')) return route.fulfill({ json: messages });
      if (path.endsWith('/settings/theme')) return route.fulfill({ json: null });
      if (path.endsWith('/settings/shabbat/status')) return route.fulfill({ json: { active: false } });
      if (path.endsWith('/settings/rituals/status')) return route.fulfill({ json: { active: false } });
      return route.fulfill({ json: {} });
    });
  });

  for (const viewport of [
    { name: 'small android', width: 320, height: 640 },
    { name: 'pixel android', width: 412, height: 915 },
  ]) {
    test(`fits ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByRole('button', { name: /open reward shop/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /complete brush teeth/i })).toBeVisible();
      await expect(page.getByText('Family Board')).toBeVisible();

      const layout = await page.evaluate(() => {
        const doc = document.documentElement;
        const oversized = Array.from(document.body.querySelectorAll('*'))
          .filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -2 || rect.right > window.innerWidth + 2);
          })
          .map(el => ({
            tag: el.tagName,
            className: String((el as HTMLElement).className || '').slice(0, 120),
            left: el.getBoundingClientRect().left,
            right: el.getBoundingClientRect().right,
          }));
        return {
          horizontalOverflow: doc.scrollWidth - doc.clientWidth,
          oversized,
        };
      });

      expect(layout.horizontalOverflow).toBeLessThanOrEqual(2);
      expect(layout.oversized).toEqual([]);
    });
  }
});
