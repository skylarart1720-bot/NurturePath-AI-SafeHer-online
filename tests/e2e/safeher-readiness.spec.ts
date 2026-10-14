import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { db } from '../../lib/db';
import { lessons } from '../../lib/safeher-content';

test('public layouts at all five required widths have no overflow or serious accessibility violations', async ({
  page,
}, info) => {
  test.setTimeout(600000);
  test.skip(info.project.name !== 'desktop', 'One responsive sweep covers both project viewports.');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/learn', '/find-support', '/ask-safeher', '/enroll']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      if (route === '/find-support')
        await expect(page.getByText('Loading support information…')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(audit.violations).toEqual([]);
    }
  }
});

test('protected workspace redirects guests and production scripts have nonce policy', async ({
  page,
}) => {
  for (const section of ['content', 'partners', 'metrics']) {
    await page.goto('/dashboard/' + section);
    await expect(page).toHaveURL(/\/login/);
  }
  const response = await page.goto('/');
  const policy = response?.headers()['content-security-policy'];
  expect(policy).toContain("'nonce-");
  expect(policy?.split(';').find((value) => value.includes('script-src'))).not.toContain(
    'unsafe-inline',
  );
  expect(await page.locator('script[nonce]').count()).toBeGreaterThan(0);
});

test('assistant returns current review metadata and bounded body errors', async ({ request }) => {
  const origin = process.env.APP_URL ?? 'http://localhost:3200';
  const answer = await request.post('/api/safeher/ask', {
    headers: { origin },
    data: { question: 'What is consent?' },
  });
  expect(answer.status()).toBe(200);
  const json = await answer.json();
  expect(json.data.sources[0].review.version).toBeGreaterThan(0);
  expect(json.data.sources[0].review.expiresAt).toBeTruthy();
  const oversized = await request.post('/api/auth/login', {
    headers: { origin },
    data: { email: 'test@example.invalid', password: 'a'.repeat(5000) },
  });
  expect(oversized.status()).toBe(413);
});

test('reviewer workspace records history and restores an earlier version only as a draft', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('reviewer@safeher.example');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.SAFEHER_DEMO_PASSWORD ?? process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/dashboard/content');
  await expect(page.getByRole('heading', { name: 'Content review', exact: true })).toBeVisible();
  await page.goto('/dashboard/metrics');
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
  const lesson = {
    ...lessons[0],
    slug: 'history-' + crypto.randomUUID(),
    title: 'Synthetic revision fixture',
  };
  const origin = process.env.APP_URL ?? 'http://localhost:3200';
  try {
    expect(
      (
        await page.request.post('/api/safeher/admin/content', { headers: { origin }, data: lesson })
      ).status(),
    ).toBe(200);
    expect(
      (
        await page.request.post('/api/safeher/admin/review', {
          headers: { origin },
          data: { slug: lesson.slug, version: 1, status: 'APPROVED', scope: 'DEMO_ONLY' },
        })
      ).status(),
    ).toBe(200);
    const response = await page.request.get('/api/safeher/admin/history?slug=' + lesson.slug);
    const { data } = await response.json();
    expect(data.map((r: { version: number }) => r.version)).toEqual([2, 1]);
    expect(
      (
        await page.request.post('/api/safeher/admin/rollback', {
          headers: { origin },
          data: { slug: lesson.slug, version: 2, revision: 1 },
        })
      ).status(),
    ).toBe(200);
    const row = await db.safeherContent.findUniqueOrThrow({ where: { slug: lesson.slug } });
    expect(row.status).toBe('DRAFT');
    expect(row.reviewedAt).toBeNull();
    expect(row.version).toBe(3);
    expect(
      (
        await page.request.post('/api/safeher/admin/rollback', {
          headers: { origin },
          data: { slug: lesson.slug, version: 2, revision: 1 },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await page.request.post('/api/safeher/admin/translation', {
          headers: { origin },
          data: {
            sourceSlug: lesson.slug,
            sourceVersion: 3,
            locale: 'fr',
            lesson: { ...lesson, title: 'Synthetic translation fixture' },
          },
        })
      ).status(),
    ).toBe(200);
    const translation = await db.safeherTranslation.findUniqueOrThrow({
      where: { sourceSlug_locale: { sourceSlug: lesson.slug, locale: 'fr' } },
    });
    expect(
      (
        await page.request.post('/api/safeher/admin/translation-review', {
          headers: { origin },
          data: { id: translation.id, version: 1, status: 'APPROVED' },
        })
      ).status(),
    ).toBe(403);
    // Withdrawal must work even when the source is draft or no longer current.
    expect(
      (
        await page.request.post('/api/safeher/admin/translation-review', {
          headers: { origin },
          data: { id: translation.id, version: 1, status: 'DRAFT' },
        })
      ).status(),
    ).toBe(200);
    await db.auditEvent.deleteMany({ where: { entityId: translation.id } });
  } finally {
    await db.safeherTranslation.deleteMany({ where: { sourceSlug: lesson.slug } });
    await db.safeherRevision.deleteMany({
      where: { slug: { in: [lesson.slug, lesson.slug + ':fr'] } },
    });
    await db.safeherContent.deleteMany({ where: { slug: lesson.slug } });
    await db.auditEvent.deleteMany({ where: { entityId: lesson.slug } });
  }
});
