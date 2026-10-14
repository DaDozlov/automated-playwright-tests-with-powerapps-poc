import fs from 'node:fs';
import path from 'node:path';
import { test as setup, expect, type Page } from '@playwright/test';
import { AUTH_FILE, env } from '../utils/env';

const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000;
const MANUAL_SIGN_IN_TIMEOUT_MS = 10 * 60 * 1000;

function sessionIsFresh(): boolean {
  if (process.env.FORCE_LOGIN) return false;
  if (!fs.existsSync(AUTH_FILE)) return false;
  return Date.now() - fs.statSync(AUTH_FILE).mtimeMs < MAX_SESSION_AGE_MS;
}

async function signInWithPassword(page: Page, user: string, password: string) {
  const email = page.locator('input[type="email"]');
  await email.waitFor({ timeout: 60_000 });
  await email.fill(user);
  await page.locator('input[type="submit"]').click();

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ timeout: 60_000 });
  await passwordInput.fill(password);
  await page.locator('input[type="submit"]').click();

  // "Stay signed in?"
  const staySignedIn = page.locator('#idSIButton9, input[type="submit"][value="Yes"], input[type="submit"][value="Ja"]');
  if (await staySignedIn.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await staySignedIn.click();
  }
}

setup('sign in to Power Apps and SharePoint', async ({ page }) => {
  setup.skip(sessionIsFresh(), `Session in ${AUTH_FILE} is younger than 8 hours (set FORCE_LOGIN=1 to sign in again).`);

  await page.goto(env.appUrl);

  if (env.testUser && env.testPassword) {
    await signInWithPassword(page, env.testUser, env.testPassword);
  } else {
    console.log('\n>>> Sign in in the browser window that just opened (MFA is fine). Waiting up to 10 minutes...\n');
  }

  const app = page.frameLocator('iframe[name="fullscreen-app-host"]');
  await expect(app.locator('input, textarea').first()).toBeVisible({ timeout: MANUAL_SIGN_IN_TIMEOUT_MS });

  // Visit SharePoint once so its cookies are part of the saved session (used by tests/utils/sharepoint.ts)
  await page.goto(env.spSiteUrl);
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(new RegExp('^' + env.spSiteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), { timeout: 60_000 });

  const state = await page.context().storageState();
  // PAAppLoadCache would pin every test run to the app version from sign-in time
  for (const origin of state.origins) {
    origin.localStorage = origin.localStorage.filter((entry) => !entry.name.startsWith('PAAppLoadCache'));
  }
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2));
});
