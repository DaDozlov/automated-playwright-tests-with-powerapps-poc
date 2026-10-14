import { defineConfig, devices } from '@playwright/test';
import { AUTH_FILE, env, pace } from './tests/utils/env';

const viewport = { width: 1440, height: 900 };

export default defineConfig({
  testDir: './tests',
  // Power Apps loads slowly
  timeout: 180_000,
  expect: { timeout: 20_000 },
  // The tests share one SharePoint list
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    viewport,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: { mode: 'on', size: viewport },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /setup\/auth\.setup\.ts/,
      timeout: 15 * 60_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport,
        // Watch the sign-in yourself unless it runs with TEST_USER
        headless: !!env.testUser,
        // Never record the sign-in
        video: 'off',
      },
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport,
        storageState: AUTH_FILE,
        launchOptions: { slowMo: pace.slowMo },
      },
    },
  ],
});
