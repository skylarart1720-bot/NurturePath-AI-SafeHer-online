import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { answerQuestion } from '../../lib/safeher-assistant';
import { lessons } from '../../lib/safeher-content';

const csa = {
  id: 'safeher-gh-csa',
  name: 'Cyber Security Authority — CERT-GH',
  category: 'Digital safety',
  contactUrl: 'https://www.csa.gov.gh/report',
};
test('everyday wording, sources, follow-ups and real support contacts work together', async ({
  page,
}) => {
  const questions: string[] = [];
  await page.route('**/api/safeher/ask', async (route) => {
    const { question } = route.request().postDataJSON();
    questions.push(question);
    const answer = await answerQuestion(question, lessons);
    await route.fulfill({
      json: { data: { ...answer, supportContacts: [csa], supportUnavailable: false } },
    });
  });
  await page.goto('/ask-safeher');
  await page.getByLabel('Your question').fill('Someone keeps threatening me online');
  await page.getByRole('button', { name: 'Ask SafeHer', exact: true }).click();
  const answer = page.getByRole('article', { name: 'SafeHer answer' });
  await expect(answer).toBeFocused();
  await expect(answer).toContainText('Online harassment');
  await expect(answer.getByRole('link', { name: 'Official contact page' })).toHaveAttribute(
    'href',
    csa.contactUrl,
  );
  await expect(answer.locator('a[target]')).toHaveCount(0);
  const followUp = page
    .getByRole('region', { name: 'Suggested follow-up questions' })
    .getByRole('button')
    .first();
  const nextQuestion = await followUp.innerText();
  await followUp.click();
  await expect(answer).toBeVisible();
  expect(questions).toEqual(['Someone keeps threatening me online', nextQuestion]);
  await expect(answer.getByRole('heading', { name: 'You could ask next' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('an unknown question offers topics and can recover through a suggested question', async ({
  page,
}) => {
  await page.route('**/api/safeher/ask', async (route) => {
    const { question } = route.request().postDataJSON();
    await route.fulfill({
      json: {
        data: {
          ...(await answerQuestion(question, lessons)),
          supportContacts: [],
          supportUnavailable: false,
        },
      },
    });
  });
  await page.goto('/ask-safeher');
  await page.getByLabel('Your question').fill('quantum mechanics');
  await page.getByRole('button', { name: 'Ask SafeHer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Let’s find the right topic' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore all learning topics' })).toHaveAttribute(
    'href',
    '/learn',
  );
  await page
    .getByRole('region', { name: 'Suggested follow-up questions' })
    .getByRole('button')
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'A starting point from SafeHer' })).toBeVisible();
});

test('unavailable content can be retried and clearing an answer returns focus to the input', async ({
  page,
}) => {
  let attempts = 0;
  await page.route('**/api/safeher/ask', async (route) => {
    const { question } = route.request().postDataJSON();
    await route.fulfill({
      json: {
        data: {
          ...(await answerQuestion(question, attempts++ === 0 ? [] : lessons)),
          supportContacts: [],
          supportUnavailable: false,
        },
      },
    });
  });
  await page.goto('/ask-safeher');
  await page.getByLabel('Your question').fill('What does consent mean?');
  await page.getByRole('button', { name: 'Ask SafeHer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Learning information is unavailable' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Suggested follow-up questions' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A starting point from SafeHer' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear this answer' }).click();
  await expect(page.getByRole('article', { name: 'SafeHer answer' })).toHaveCount(0);
  await expect(page.getByLabel('Your question')).toBeFocused();
});
