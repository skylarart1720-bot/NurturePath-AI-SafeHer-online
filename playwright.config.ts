import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 30000 },
  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:3200',
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_PRODUCTION === 'true' ? 'npm run start' : 'npm run dev',
    url: (process.env.APP_URL ?? 'http://localhost:3200') + '/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
