import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';
test('capture reviewed synthetic public and worker screens', async ({ page }, testInfo) => {
  mkdirSync('docs/screenshots', { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A little knowledge/ })).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto('/legacy-login');
  await page.getByRole('button', { name: 'Health worker', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page).toHaveURL(/\/worker$/);
  await expect(page.getByRole('heading', { name: 'Follow-up comes first' })).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/worker-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
