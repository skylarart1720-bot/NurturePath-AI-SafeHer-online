import 'dotenv/config';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { db } from '../../lib/db';
import { lessons } from '../../lib/safeher-content';
const origin = process.env.APP_URL ?? 'http://localhost:3200';
async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.SAFEHER_DEMO_PASSWORD ?? process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
test('public pages pass automated accessibility checks', async ({ page }) => {
  const findings: { page: string; id: string; nodes: unknown }[] = [];
  for (const path of [
    '/',
    '/ask-safeher',
    '/learn',
    '/learn/consent',
    '/digital-safety',
    '/find-support',
    '/privacy',
    '/contact',
    '/login',
  ]) {
    await page.goto(path);
    if (path === '/find-support') await expect(page.getByText('4 matching entries')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    findings.push(
      ...results.violations.map((v) => ({
        page: path,
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
  }
  expect(findings, JSON.stringify(findings)).toEqual([]);
});
test('drafts require review and edits remove published retrieval', async ({ page }) => {
  await login(page, 'reviewer@safeher.example');
  const lesson = {
    ...lessons[0],
    slug: 'test-review-' + crypto.randomUUID(),
    title: 'Synthetic review fixture',
    keywords: ['testreviewfixture'],
  };
  try {
    let res = await page.request.post('/api/safeher/admin/content', {
      headers: { Origin: origin },
      data: lesson,
    });
    expect(res.status()).toBe(200);
    let contents = (await (await page.request.get('/api/safeher/content')).json()).data;
    expect(contents.some((l: { slug: string }) => l.slug === lesson.slug)).toBe(false);
    let row = await db.safeherContent.findUniqueOrThrow({ where: { slug: lesson.slug } });
    res = await page.request.post('/api/safeher/admin/review', {
      headers: { Origin: origin },
      data: { slug: lesson.slug, version: row.version, status: 'APPROVED', scope: 'DEMO_ONLY' },
    });
    expect(res.status()).toBe(200);
    contents = (await (await page.request.get('/api/safeher/content')).json()).data;
    expect(contents.some((l: { slug: string }) => l.slug === lesson.slug)).toBe(true);
    res = await page.request.post('/api/safeher/ask', {
      headers: { Origin: origin },
      data: { question: 'testreviewfixture' },
    });
    expect((await res.json()).data.found).toBe(true);
    res = await page.request.post('/api/safeher/admin/review', {
      headers: { Origin: origin },
      data: { slug: lesson.slug, version: row.version, status: 'APPROVED', scope: 'DEMO_ONLY' },
    });
    expect(res.status()).toBe(409);
    res = await page.request.post('/api/safeher/admin/content', {
      headers: { Origin: origin },
      data: { ...lesson, title: 'Edited synthetic fixture' },
    });
    expect(res.status()).toBe(200);
    res = await page.request.post('/api/safeher/ask', {
      headers: { Origin: origin },
      data: { question: 'testreviewfixture' },
    });
    expect((await res.json()).data.found).toBe(false);
    row = await db.safeherContent.findUniqueOrThrow({ where: { slug: lesson.slug } });
    res = await page.request.post('/api/safeher/admin/review', {
      headers: { Origin: origin },
      data: {
        slug: lesson.slug,
        version: row.version,
        status: 'APPROVED',
        scope: 'PILOT_REVIEWED',
      },
    });
    expect(res.status()).toBe(403);
  } finally {
    await db.safeherRevision.deleteMany({ where: { slug: lesson.slug } });
    await db.safeherContent.deleteMany({ where: { slug: lesson.slug } });
  }
});
test('partners edit assigned services only and cannot verify', async ({ page }) => {
  const partner = await db.user.findUniqueOrThrow({ where: { email: 'partner@safeher.example' } });
  const service = await db.safeherService.create({
    data: {
      name: 'Synthetic partner fixture',
      description: 'Synthetic fixture only',
      region: 'Greater Accra',
      category: 'Digital safety',
      accessMethod: 'Online',
      eligibility: 'Synthetic only',
      synthetic: true,
      partnerId: partner.id,
      referralInstructions: 'No live contact exists.',
    },
  });
  try {
    await login(page, 'partner@safeher.example');
    await expect(page.getByText('Synthetic partner fixture', { exact: true })).toBeVisible();
    const body = {
      id: service.id,
      name: service.name,
      description: service.description,
      region: service.region,
      category: service.category,
      accessMethod: 'Online',
      eligibility: service.eligibility,
      hours: null,
      contactUrl: null,
      verificationSource: null,
      synthetic: true,
      referralInstructions: service.referralInstructions,
    };
    const own = await page.request.post('/api/safeher/admin/service-update', {
      headers: { Origin: origin },
      data: body,
    });
    expect(own.status()).toBe(200);
    const other = await page.request.post('/api/safeher/admin/service-update', {
      headers: { Origin: origin },
      data: { ...body, id: 'safeher-demo-0' },
    });
    expect(other.status()).toBe(403);
    const verify = await page.request.post('/api/safeher/admin/verify', {
      headers: { Origin: origin },
      data: { id: service.id },
    });
    expect(verify.status()).toBe(403);
    expect(
      (await db.safeherService.findUniqueOrThrow({ where: { id: service.id } })).verifiedAt,
    ).toBeNull();
  } finally {
    await db.safeherServiceReview.deleteMany({ where: { serviceId: service.id } });
    await db.safeherService.deleteMany({ where: { id: service.id } });
  }
});
