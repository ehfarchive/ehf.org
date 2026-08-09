import { expect, test } from '@playwright/test';

test('homepage exposes the site title and main landmark', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Edmund Hillary Fellowship/i);
  await expect(page.getByRole('main')).toBeVisible();
});
