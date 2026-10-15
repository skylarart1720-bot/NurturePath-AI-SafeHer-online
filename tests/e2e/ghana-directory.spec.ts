import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
test('real Ghanaian contacts are traceable and require a deliberate contact choice', async ({
  page,
}, testInfo) => {
  await page.goto('/find-support');
  await expect(page.getByText('6 matching entries')).toBeVisible();
  await expect(page.getByLabel('Include synthetic examples')).toHaveCount(0);
  mkdirSync('docs/screenshots', { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `docs/screenshots/ghana-directory-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await expect(page.getByText('SYNTHETIC EXAMPLE', { exact: true })).toHaveCount(0);
  await page.getByLabel('Service category').selectOption('Reproductive healthcare');
  await expect(page.getByText('2 matching entries')).toBeVisible();
  const msi = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'MSI Reproductive Choices Ghana', exact: true }),
  });
  await expect(msi.getByText('PUBLIC CONTACT DETAILS CHECKED', { exact: true })).toBeVisible();
  await expect(msi.getByRole('link', { name: /View the published source/ })).toHaveAttribute(
    'href',
    'https://mariestopes.org.gh/contact-us/',
  );
  await msi.getByRole('button', { name: 'Review contact options' }).click();
  await expect(page.getByRole('button', { name: 'Continue to guidance' })).toBeDisabled();
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await page.getByLabel('I understand these limitations').check();
  await page.getByRole('button', { name: 'Continue to guidance' }).click();
  await expect(page.getByRole('link', { name: 'Call 0800208585', exact: true })).toHaveAttribute(
    'href',
    'tel:0800208585',
  );
  await expect(page.getByRole('link', { name: 'Provider contact page' })).toHaveAttribute(
    'href',
    'https://mariestopes.org.gh/contact-us/',
  );
  await expect(page.getByRole('status')).toContainText('Nothing has been sent by SafeHer');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByLabel('I understand these limitations').uncheck();
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your next steps/ })).toHaveCount(0);
  await page.getByLabel('Service category').selectOption('GBV response');
  await expect(page.getByText('2 matching entries')).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Helpline of Hope — Ministry of Gender, Children and Social Protection',
      exact: true,
    }),
  ).toBeVisible();
});
test('digital-safety reporting contacts expose provider disclosure limits', async ({ page }) => {
  await page.goto('/find-support');
  await page.getByLabel('Service category').selectOption('Digital safety');
  const csa = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Cyber Security Authority — CERT-GH', exact: true }),
  });
  await csa.getByRole('button', { name: 'Review contact options' }).click();
  await expect(
    page.getByText('The form asks for contact and incident information', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('I understand these limitations').check();
  await page.getByRole('button', { name: 'Continue to guidance' }).click();
  await expect(page.getByRole('link', { name: 'Call 292', exact: true })).toHaveAttribute(
    'href',
    'tel:292',
  );
  await expect(
    page.getByRole('link', { name: 'Email report@csa.gov.gh', exact: true }),
  ).toHaveAttribute('href', 'mailto:report@csa.gov.gh');
});
