import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill in ${name}.`);
  }
  return value;
}

export const env = {
  get appUrl() {
    return required('APP_URL');
  },
  get spSiteUrl() {
    return required('SP_SITE_URL').replace(/\/+$/, '');
  },
  get spListTitle() {
    return required('SP_LIST_TITLE');
  },
  testUser: process.env.TEST_USER?.trim() || undefined,
  testPassword: process.env.TEST_PASSWORD || undefined,
};

/** Signed-in browser session (cookies + localStorage), written by tests/setup/auth.setup.ts. */
export const AUTH_FILE = '.auth/user.json';

/** DEMO=1 slows everything down so the run can be watched or recorded. */
export const isDemo = process.env.DEMO === '1';

export const pace = isDemo
  ? { typingDelayMs: 60, slowMo: 150, stepPauseMs: 1_200, endPauseMs: 3_000 }
  : { typingDelayMs: 10, slowMo: 0, stepPauseMs: 0, endPauseMs: 500 };
