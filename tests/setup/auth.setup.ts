import fs from 'node:fs';
import { test as setup } from '@playwright/test';
import { NewClientFormPage } from '../pages/NewClientFormPage';
import { AUTH_FILE, env } from '../utils/env';

// Reuse a recent session instead of signing in on every run. Set FORCE_LOGIN=1 to refresh it.
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const sessionIsFresh =
  !process.env.FORCE_LOGIN &&
  fs.existsSync(AUTH_FILE) &&
  Date.now() - fs.statSync(AUTH_FILE).mtimeMs < SESSION_MAX_AGE_MS;

setup.skip(sessionIsFresh, 'Reusing saved session in .auth/user.json');

setup('sign in to Power Apps and SharePoint', async ({ page }) => {
  setup.setTimeout(12 * 60_000);
  const form = new NewClientFormPage(page);

  await page.goto(env.appUrl);

  if (env.testUser) {
    // Unattended login: only works for an account without MFA.
    await page.locator('input[type="email"]').fill(env.testUser);
    await page.locator('input[type="submit"]').click();
    await page.locator('input[type="password"]').fill(env.testPassword);
    await page.locator('input[type="submit"]').click();
    // "Stay signed in?" prompt, if shown.
    const staySignedIn = page.locator('#idSIButton9');
    if (await staySignedIn.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await staySignedIn.click();
  } else {
    console.log('\n>>> Sign in in the browser window (including MFA). Waiting up to 10 minutes...\n');
  }

  await form.input('CompanyName').waitFor({ timeout: 10 * 60_000 });

  // Visit SharePoint once so its cookies end up in the saved session (used for REST checks and cleanup).
  await page.goto(env.spSiteUrl);
  await page.waitForURL((url) => url.hostname.endsWith('.sharepoint.com'), { timeout: 60_000 });
  await page.waitForLoadState('domcontentloaded');

  fs.mkdirSync('.auth', { recursive: true });
  const state = await page.context().storageState();
  // The Power Apps player caches the app package in localStorage (PAAppLoadCache-<env>-<app>).
  // If that were saved, every test would load the version from sign-in time instead of the
  // latest published one. Keep the sign-in tokens, drop the app cache.
  for (const origin of state.origins) {
    origin.localStorage = origin.localStorage.filter((item) => !item.name.startsWith('PAAppLoadCache'));
  }
  fs.writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2));
});
