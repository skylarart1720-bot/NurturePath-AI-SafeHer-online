import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { db } from '../../lib/db';
import bcrypt from 'bcryptjs';
import { mkdirSync } from 'node:fs';
const origin = process.env.APP_URL ?? 'http://localhost:3200';
async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.SAFEHER_DEMO_PASSWORD ?? process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test('all required pages, responsive navigation and accessible controls', async ({
  page,
}, info) => {
  for (const path of [
    '/',
    '/ask-safeher',
    '/learn',
    '/learn/consent',
    '/digital-safety',
    '/find-support',
    '/about',
    '/privacy',
    '/safety',
    '/contact',
    '/login',
    '/dashboard',
  ]) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.locator('html').getAttribute('lang')).toBe('en');
    await expect(page.getByRole('link', { name: 'Quick Exit', exact: true })).toBeVisible();
  }
  await page.goto('/');
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await page.locator('#sh-navigation').getByRole('link', { name: 'Ask SafeHer' }).click();
    await expect(page).toHaveURL(/ask-safeher$/);
  }
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  mkdirSync('docs/screenshots', { recursive: true });
  await page.getByRole('heading', { level: 1 }).click();
  await page.screenshot({
    path: `docs/screenshots/safeher-home-${info.project.name}.png`,
    fullPage: true,
  });
});
test('harassment, consent and child marriage journeys use attributed sources', async ({ page }) => {
  for (const question of ['online harassment', 'consent', 'child marriage']) {
    await page.goto('/ask-safeher');
    await page.getByLabel('Your question').fill(question);
    await page.getByRole('button', { name: 'Ask SafeHer', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'A starting point from SafeHer' }),
    ).toBeVisible();
    await expect(page.getByText('Sources & related learning')).toBeVisible();
    await page.locator('.sh-sources').getByRole('link', { name: 'Read lesson' }).first().click();
    await expect(page.getByRole('heading', { name: 'Check your understanding' })).toBeVisible();
  }
  await page.goto('/learn/consent');
  await page.getByLabel('No. Ask separately before sharing').check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'That’s right' })).toBeVisible();
});
test('directory filtering and consent guidance never imply live synthetic services', async ({
  page,
}) => {
  await page.goto('/find-support');
  await page.getByText('Directory display options', { exact: true }).click();
  await page.getByLabel('Include synthetic examples').check();
  await page.getByLabel('Search organizations').fill('Example Reproductive healthcare Centre');
  await page.getByLabel('Service category').selectOption('Reproductive healthcare');
  await expect(page.getByText('1 matching entries')).toBeVisible();
  await expect(page.getByText('SYNTHETIC EXAMPLE', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View manual support steps' }).click();
  await expect(page.getByRole('button', { name: 'Continue to guidance' })).toBeDisabled();
  await page.getByLabel('I understand these limitations').check();
  await page.getByRole('button', { name: 'Continue to guidance' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'No contact is available' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your next steps/ })).toHaveCount(0);
});
test('approved downloads work offline and chat is never cached', async ({ page, context }) => {
  await page.goto('/learn/digital-privacy');
  await page.getByRole('button', { name: 'Save for offline reading' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto('/offline');
  await page.getByRole('button', { name: 'Small steps, stronger privacy' }).click();
  await expect(page.locator('.sh-answer')).toContainText('unique password');
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Small steps, stronger privacy' }).click();
  await expect(page.locator('.sh-answer')).toContainText('unique password');
  await expect(page.getByRole('status').filter({ hasText: 'You are offline' })).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const keys = await caches.keys();
      const urls = [];
      for (const key of keys) {
        const cache = await caches.open(key);
        urls.push(...(await cache.keys()).map((r) => r.url));
      }
      return urls.every(
        (u) => !u.includes('/api/') && !u.includes('/ask-safeher') && !u.includes('/dashboard'),
      );
    }),
  ).toBe(true);
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Remove all downloads' }).click();
  await expect(page.getByText('No resources saved yet.')).toBeVisible();
});
test('guest, learner, reviewer and partner permissions and account deletion', async ({
  page,
  request,
}) => {
  expect((await request.get('/api/safeher/admin')).status()).toBe(401);
  await login(page, 'learner@safeher.example');
  expect((await page.request.get('/api/safeher/admin')).status()).toBe(403);
  expect((await page.request.get('/api/dashboard/metrics')).status()).toBe(403);
  await page.goto('/learn/consent');
  await page.getByLabel('No. Ask separately before sharing').check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved to your optional account' }),
  ).toBeVisible();
  await page.goto('/privacy');
  await page.getByRole('button', { name: 'Delete account progress', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'account progress was removed' }),
  ).toBeVisible();
  await page.request.post('/api/safeher/logout', { headers: { Origin: origin }, data: {} });
  await login(page, 'reviewer@safeher.example');
  await expect(
    page.getByRole('heading', { name: 'Educational content & knowledge base' }),
  ).toBeVisible();
  expect(
    (
      await page.request.post('/api/safeher/admin/verify', {
        headers: { Origin: origin },
        data: { id: 'safeher-demo-0' },
      })
    ).status(),
  ).toBe(403);
  await page.request.post('/api/safeher/logout', { headers: { Origin: origin }, data: {} });
  await login(page, 'partner@safeher.example');
  await expect(page.getByText('No authorized service entries.')).toBeVisible();
  expect(
    (
      await page.request.post('/api/safeher/admin/review', {
        headers: { Origin: origin },
        data: { slug: 'consent', version: 1, status: 'APPROVED', scope: 'DEMO_ONLY' },
      })
    ).status(),
  ).toBe(403);
  await page.request.post('/api/safeher/logout', { headers: { Origin: origin }, data: {} });
  const user = await db.user.create({
    data: {
      email: `safeher-delete-${crypto.randomUUID()}@example.invalid`,
      name: 'Synthetic deletion fixture',
      organizationId: 'safeher-demo-org',
      role: 'REGISTERED_USER',
      passwordHash: await bcrypt.hash(
        process.env.SAFEHER_DEMO_PASSWORD ?? process.env.DEMO_PASSWORD!,
        12,
      ),
    },
  });
  try {
    await login(page, user.email);
    await page.goto('/privacy');
    await page.getByRole('button', { name: 'Delete optional account', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm account deletion' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'deleted from the active database' }),
    ).toBeVisible();
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect((await page.request.get('/api/safeher/admin')).status()).toBe(401);
  } finally {
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
test('admin review, verification gate, feedback and safety refusal', async ({ page }) => {
  await login(page, 'admin@safeher.example');
  await expect(page.getByRole('heading', { name: 'Aggregate impact' })).toBeVisible();
  expect(
    (
      await page.request.post('/api/safeher/admin/verify', {
        headers: { Origin: origin },
        data: { id: 'safeher-demo-0' },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post('/api/safeher/referrals', { headers: { Origin: origin }, data: {} })
    ).status(),
  ).toBe(403);
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'feedback was recorded' })).toBeVisible();
  await page.goto('/ask-safeher');
  await page.getByLabel('Your question').fill('diagnose me and prescribe a dosage');
  await page.getByRole('button', { name: 'Ask SafeHer', exact: true }).click();
  await expect(page.locator('.sh-answer')).toContainText('cannot diagnose');
  await expect(page.locator('.sh-sources')).toHaveCount(0);
});
