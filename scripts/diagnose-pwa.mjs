import 'dotenv/config';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('Browser error:', message.text().slice(0, 400));
  });
  page.on('pageerror', (error) => console.log('Page error:', error.message));
  await page.goto(process.env.APP_URL + '/login');
  await page.getByLabel('Email address').fill('colleague@demo.nurturepath.test');
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await page.waitForURL('**/worker', { timeout: 30000 });
  await page.getByRole('heading', { name: 'Follow-up comes first' }).waitFor({ timeout: 30000 });
  console.log('Worker shell hydrated.');
  await page.goto(process.env.APP_URL + '/offline');
  await page.waitForTimeout(3000);
  console.log(
    JSON.stringify(
      await page.evaluate(async () => ({
        actorRemembered: !!sessionStorage.getItem('np_actor'),
        registrations: (await navigator.serviceWorker.getRegistrations()).map((r) => ({
          scope: r.scope,
          active: r.active?.state,
          installing: r.installing?.state,
          waiting: r.waiting?.state,
        })),
        cacheKeys: await caches.keys(),
        offlineForm: !!document.querySelector('input[placeholder="e.g. Demo Ama 21"]'),
      })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
