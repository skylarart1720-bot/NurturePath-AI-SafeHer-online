import { test, expect } from '@playwright/test';
import { db } from '../../lib/db';
import { totp } from '../../lib/mfa';
test('MFA setup requires a password and prevents code reuse', async ({ page }) => {
  const origin = process.env.APP_URL!,
    password = process.env.DEMO_PASSWORD!,
    email = `mfa-${Date.now()}@demo.nurturepath.test`;
  let userId = '';
  try {
    await page.goto('/legacy-login');
    await page.getByRole('button', { name: 'Programme admin', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in to workspace' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    const clinic = await db.clinic.findFirstOrThrow({
      where: { name: 'Demo Adenta Community Clinic' },
    });
    const create = await page.request.post('/api/users', {
      headers: { Origin: origin },
      data: { name: 'Demo MFA Test', email, password, role: 'HEALTH_WORKER', clinicId: clinic.id },
    });
    expect(create.ok()).toBe(true);
    userId = (await create.json()).data.id;
    await page.request.post('/api/auth/logout', { headers: { Origin: origin }, data: {} });
    await page.goto('/legacy-login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in to workspace' }).click();
    await expect(page).toHaveURL(/\/worker$/);
    const wrong = await page.request.post('/api/security', {
      headers: { Origin: origin },
      data: { action: 'setup', password: 'incorrect-demo-password' },
    });
    expect(wrong.status()).toBe(401);
    const setup = await page.request.post('/api/security', {
      headers: { Origin: origin },
      data: { action: 'setup', password },
    });
    expect(setup.ok()).toBe(true);
    const secret = (await setup.json()).data.secret;
    const counter = Math.floor(Date.now() / 30000);
    const enable = await page.request.post('/api/security', {
      headers: { Origin: origin },
      data: { action: 'enable', password, code: totp(secret, counter) },
    });
    expect(enable.ok()).toBe(true);
    await page.request.post('/api/auth/logout', { headers: { Origin: origin }, data: {} });
    const reused = await page.request.post('/api/auth/login', {
      headers: { Origin: origin },
      data: { email, password, code: totp(secret, counter) },
    });
    expect(reused.status()).toBe(401);
    const fresh = await page.request.post('/api/auth/login', {
      headers: { Origin: origin },
      data: { email, password, code: totp(secret, counter + 1) },
    });
    expect(fresh.ok()).toBe(true);
    const replay = await page.request.post('/api/auth/login', {
      headers: { Origin: origin },
      data: { email, password, code: totp(secret, counter + 1) },
    });
    expect(replay.status()).toBe(401);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
