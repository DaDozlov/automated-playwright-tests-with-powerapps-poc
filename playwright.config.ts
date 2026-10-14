import { defineConfig, devices } from '@playwright/test';
import { AUTH_FILE, env, pace } from './tests/utils/env';

// Without TEST_USER the setup project opens a visible browser so you can sign in by hand (MFA-friendly).
const manualLogin = !env.testUser;

export default defineConfig({
  testDir: './tests',
  // Power Apps is slow to load (up to 2 x 60 s, see NewClientFormPage.open), plus the test itself.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  // All tests share one SharePoint list, so run them one at a time.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Record every test (1440x900 to match the viewport). Videos: test-results/<test>/video.webm and in the HTML report.
    video: { mode: 'on', size: { width: 1440, height: 900 } },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      // No video of the sign-in, so account details never end up in a recording.
      use: { ...devices['Desktop Chrome'], headless: !manualLogin, video: 'off' },
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: AUTH_FILE,
        launchOptions: { slowMo: pace.slowMoMs },
      },
    },
  ],
});
