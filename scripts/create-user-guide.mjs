import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1500 } });
  await page.goto(pathToFileURL(path.join(root, 'docs/USER-GUIDE.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(root, 'docs/NurturePath-AI-User-Guide.pdf'),
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="font-family:Arial;font-size:9px;color:#546474;width:100%;margin:0 18mm;display:flex;justify-content:space-between"><span>NurturePath AI · User &amp; completion guide · Synthetic demo</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    margin: { top: '14mm', bottom: '17mm', left: '16mm', right: '16mm' },
  });
  await page
    .locator('.page')
    .first()
    .screenshot({ path: path.join(root, 'test-results/user-guide-preview.png') });
  console.log('Created docs/NurturePath-AI-User-Guide.pdf');
} finally {
  await browser.close();
}
