import { test, expect } from '@playwright/test';
test('worker closes the care loop using keyboard-accessible forms', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Health worker', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/worker$/);
  const before = await page.evaluate(
    async () => (await (await fetch('/api/dashboard/metrics')).json()).data,
  );
  await page.getByRole('link', { name: 'Enroll a mother', exact: true }).click();
  const name = 'Demo E2E ' + Date.now();
  await page.getByLabel('Fictional name or alias').fill(name);
  await page.getByLabel('Fictional phone number').fill('+233000000555');
  await page.getByLabel('This synthetic record').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Registration consent').check();
  await page.getByLabel('Opt in to neutral SMS').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Enroll fictional mother' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
  await page.goto('/worker/mothers');
  await page.getByRole('link').filter({ hasText: name }).click();
  const when = new Date(Date.now() - 86400000);
  const local = new Date(+when - when.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await page.getByLabel('Date and time (your device timezone)').fill(local);
  await page.getByRole('button', { name: 'Schedule visit & follow-up' }).click();
  await expect(page.getByRole('heading', { name: 'Follow-up history' })).toBeVisible();
  await page.getByRole('button', { name: 'Record contact outcome' }).click();
  await expect(page.getByText('reached', { exact: true })).toBeVisible();
  await page.getByLabel('Receiving facility').fill('Demo E2E Receiving Clinic');
  await page.getByRole('button', { name: 'Create referral', exact: true }).click();
  await expect(page.getByLabel('Next referral status')).toBeVisible();
  for (const status of ['ACCEPTED', 'ATTENDED', 'CLOSED']) {
    await page.getByLabel('Next referral status').selectOption(status);
    if (status === 'CLOSED')
      await page.getByLabel('Completion note').fill('Synthetic attendance confirmed.');
    await page.getByRole('button', { name: 'Record next status' }).click();
    if (status !== 'CLOSED')
      await expect(page.getByLabel('Next referral status')).not.toHaveValue(status);
  }
  await expect(page.getByText('closed', { exact: true })).toBeVisible();
  await page.goto('/worker/impact');
  await expect(page.getByRole('heading', { name: 'Referral closure' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const after = await page.evaluate(
    async () => (await (await fetch('/api/dashboard/metrics')).json()).data,
  );
  expect(after.closureRate.numerator).toBe(before.closureRate.numerator + 1);
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Clinic coordinator', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page).toHaveURL(/\/clinic$/);
  await page.goto('/clinic/impact');
  await expect(page.getByRole('heading', { name: 'Referral closure' })).toBeVisible();
  const clinicMetrics = await page.evaluate(
    async () => (await (await fetch('/api/dashboard/metrics')).json()).data,
  );
  expect(clinicMetrics.closureRate.numerator).toBeGreaterThanOrEqual(after.closureRate.numerator);
});
test('role and origin boundaries block unauthorized requests', async ({ page, request }) => {
  expect((await request.get('/api/mothers')).status()).toBe(401);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Programme admin', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect(
    await page.evaluate(async () => {
      const r = await fetch('/api/mothers');
      return r.status;
    }),
  ).toBe(403);
  expect(
    (
      await page.request.post('/api/clinics', {
        data: { name: 'Spoof Demo', region: 'Demo' },
        headers: { Origin: 'https://untrusted.example' },
      })
    ).status(),
  ).toBe(403);
});
test('airplane-mode registration is encrypted and synchronizes once', async ({ page, context }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Health worker', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page).toHaveURL(/\/worker$/);
  await page.goto('/offline');
  await expect(page.getByLabel('Fictional name or alias')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Fictional name or alias')).toBeVisible();
  const name = 'Demo Offline ' + Date.now();
  await page.getByLabel('Fictional name or alias').fill(name);
  await page.getByLabel('This synthetic record').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Registration consent').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Enroll fictional mother' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'encrypted offline queue' }),
  ).toBeVisible();
  const raw = await page.evaluate(async () => {
    return await new Promise<string>((resolve, reject) => {
      const open = indexedDB.open('nurturepath-offline-v1');
      open.onsuccess = () => {
        const db = open.result;
        const request = db.transaction('pending').objectStore('pending').getAll();
        request.onsuccess = () => {
          resolve(JSON.stringify(request.result));
          db.close();
        };
      };
      open.onerror = () => reject(open.error);
    });
  });
  expect(raw).not.toContain(name);
  await context.setOffline(false);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true);
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByRole('heading', { name: 'Everything is synchronized' })).toBeVisible();
  await page.goto('/worker/mothers');
  await expect(page.getByRole('link').filter({ hasText: name })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem('np_device_key'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('np_actor'))).toBeNull();
});
test('public and worker layouts fit 360px and 1440px', async ({ page }) => {
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Every mother deserves/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/login');
  await page.getByRole('button', { name: 'Health worker', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page).toHaveURL(/\/worker$/);
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Follow-up comes first' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 360) {
      await page.getByLabel('Open all workspace navigation').click();
      await expect(
        page
          .getByRole('navigation', { name: 'All mobile workspace routes' })
          .getByRole('link', { name: 'Appointments', exact: true }),
      ).toBeVisible();
    }
  }
});
