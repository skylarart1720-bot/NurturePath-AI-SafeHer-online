import 'dotenv/config';
import { chromium, expect as baseExpect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { ghanaDirectorySources } from '../lib/ghana-directory-sources';
const origin = process.env.APP_URL ?? 'http://localhost:3200';
const expect = baseExpect.configure({ timeout: 120000 });
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Run fixture checks against a local server.');
const reviewed = new Date(Date.now() - 86400000).toISOString();
const expiry = new Date(Date.now() + 30 * 86400000).toISOString();
const fixtures = ghanaDirectorySources.map((entry) => ({
  ...entry,
  verifiedAt: reviewed,
  reviewExpiresAt: expiry,
  publicationStatus: 'PUBLISHED',
}));
const regional = {
  ...fixtures[1],
  id: 'fixture-regional',
  name: 'Fixture Regional Organisation',
  region: 'Ashanti',
};
const rows = [
  ...fixtures,
  regional,
  { ...fixtures[0], id: 'fixture-expired', reviewExpiresAt: '2020-01-01' },
  { ...fixtures[0], id: 'fixture-synthetic', synthetic: true },
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
mkdirSync('test-results/support-enhancement', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(180000);
  let directoryFails = false;
  let reportFails = true;
  const reports: unknown[] = [];
  await page.route('**/api/safeher/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/directory/report')) {
      reports.push(route.request().postDataJSON());
      await route.fulfill(
        reportFails
          ? { status: 503, json: { error: { message: 'Fixture report unavailable. Try again.' } } }
          : { status: 202, json: { data: { recorded: true } } },
      );
    } else if (path.endsWith('/directory')) {
      await route.fulfill(
        directoryFails
          ? { status: 503, json: { error: { message: 'Fixture directory unavailable.' } } }
          : { json: { data: rows } },
      );
    } else await route.fulfill({ json: { data: {} } });
  });
  await page.goto(origin + '/find-support', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('7 matching entries', { exact: true })).toBeVisible();
  await expect(page.locator('.sh-provider-card')).toHaveCount(7);
  await page.getByRole('button', { name: /^Health support/ }).click();
  await expect(page.getByText('2 matching entries', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove filter: Health support' }).click();
  await expect(page.getByText('7 matching entries', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Someone is hurting/ }).click();
  await expect(page.getByText('2 matching entries', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Legal help/ }).click();
  await expect(page.getByText('2 matching entries', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Online safety/ }).click();
  await expect(page.getByText('1 matching entries', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Region', exact: true }).selectOption('Ashanti');
  await expect(page.getByRole('heading', { name: 'Regional listings', exact: true })).toBeVisible();
  await expect(page.getByText('7 matching entries', { exact: true })).toBeVisible();
  await page.getByLabel('Search organizations').fill('no-match-fixture');
  await expect(
    page.getByRole('heading', { name: 'No services match these filters' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Browse Ghana-wide enquiries' }).click();
  await expect(page.getByText('6 matching entries', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all filters', exact: true }).click();
  console.log(
    'PASS: four starting points, combined filters, chips, national/regional grouping, empty-state recovery, expired/example exclusions.',
  );

  await page.locator('#support-preparation > summary').click();
  const checklist = page.locator('#support-preparation');
  await expect(checklist.getByRole('checkbox')).toHaveCount(5);
  await checklist.getByRole('checkbox').first().check();
  expect(reports).toHaveLength(0);
  await checklist.locator('summary').click();
  const msi = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'MSI Reproductive Choices Ghana', exact: true }),
  });
  await msi.locator('.sh-support-provider-details > summary').click();
  await expect(msi.getByRole('link', { name: /View the published source/ })).toHaveAttribute(
    'href',
    'https://mariestopes.org.gh/contact-us/',
  );
  await msi.getByRole('button', { name: 'Review contact options' }).click();
  await expect(msi.getByRole('heading', { name: /your next steps/ })).toBeFocused();
  await expect(msi.getByRole('button', { name: 'Continue to guidance' })).toBeDisabled();
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await msi.getByLabel('I understand these limitations').check();
  await msi.getByRole('button', { name: 'Continue to guidance' }).click();
  await expect(msi.getByRole('link', { name: 'Call 0800208585', exact: true })).toHaveAttribute(
    'href',
    'tel:0800208585',
  );
  await msi.getByLabel('I understand these limitations').uncheck();
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await msi.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(msi.getByRole('button', { name: 'Review contact options' })).toBeFocused();
  await msi.locator('.sh-support-report > summary').click();
  await msi.getByLabel('What needs checking?').selectOption('Service unavailable');
  await msi.getByRole('button', { name: 'Submit listing report' }).click();
  await expect(msi.getByRole('alert')).toContainText('Try again');
  reportFails = false;
  await msi.getByRole('button', { name: 'Submit listing report' }).click();
  await expect(msi.getByRole('status')).toContainText('recorded for checking');
  expect(reports).toEqual([
    { serviceId: 'safeher-gh-msi', reason: 'Service unavailable' },
    { serviceId: 'safeher-gh-msi', reason: 'Service unavailable' },
  ]);
  await expect(msi.locator('textarea')).toHaveCount(0);
  console.log(
    'PASS: optional checklist, expandable facts, inline contact consent/revocation, focus return, structured report error/retry and minimal payload.',
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const result = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((node) => node.target) })),
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/support-enhancement/directory-${width}.png`,
      fullPage: true,
    });
    console.log(`${width}px PASS: overflow and automated accessibility checks.`);
  }
  directoryFails = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('main').getByRole('alert')).toContainText('directory unavailable');
  directoryFails = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('7 matching entries', { exact: true })).toBeVisible();
  console.log('PASS: directory network failure and retry.');
} finally {
  await browser.close();
}
