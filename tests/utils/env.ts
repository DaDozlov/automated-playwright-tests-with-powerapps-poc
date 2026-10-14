import 'dotenv/config';

export const AUTH_FILE = '.auth/user.json';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

export const env = {
  appUrl: required('APP_URL'),
  spSiteUrl: required('SP_SITE_URL').replace(/\/$/, ''),
  spListTitle: process.env.SP_LIST_TITLE || 'New Clients',
  testUser: process.env.TEST_USER || '',
  testPassword: process.env.TEST_PASSWORD || '',
};

/**
 * Pacing, so the recorded videos can be followed.
 * DEMO=1 (npm run test:demo) slows everything down further, for presenting.
 */
const demo = !!process.env.DEMO;
export const pace = {
  /** Delay between typed characters. */
  typingDelayMs: demo ? 60 : 20,
  /** Delay Playwright adds after every action (click, type, ...). */
  slowMoMs: demo ? 400 : 0,
  /** Pause at the start of every step, so its caption can be read. */
  stepPauseMs: demo ? 1500 : 600,
  /** Keep the final state on screen before the video ends. */
  endPauseMs: demo ? 3000 : 1500,
};
