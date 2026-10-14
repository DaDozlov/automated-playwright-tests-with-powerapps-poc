import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { env, pace } from '../utils/env';
import { FIELDS, type ClientData } from '../utils/testData';

/**
 * The published app runs inside an iframe on apps.powerapps.com.
 * Canvas controls expose their Studio name as data-control-name, so the
 * control names (see the exported app in src/canvas/) are the contract for these locators.
 */
export class NewClientFormPage {
  readonly app: FrameLocator;
  readonly submitButton: Locator;
  readonly submitAnotherButton: Locator;
  readonly successLabel: Locator;
  readonly emailError: Locator;

  constructor(readonly page: Page) {
    this.app = page.frameLocator('iframe[name="fullscreen-app-host"]');
    this.submitButton = this.control('btnSubmit').getByRole('button');
    this.submitAnotherButton = this.control('btnSubmitAnother').getByRole('button');
    this.successLabel = this.control('lblSuccess');
    this.emailError = this.control('lblContactEmailError');
  }

  control(name: string): Locator {
    return this.app.locator(`[data-control-name="${name}"]`);
  }

  input(field: keyof ClientData): Locator {
    return this.control(`txt${field}`).locator('input, textarea');
  }

  async open() {
    // On the first run per user, Power Apps asks "Allow New Clients to access your data?"
    // (SharePoint connection consent) in its own iframe. Whenever it shows up, click Allow;
    // when it doesn't, this costs nothing.
    const allow = this.page
      .locator('iframe[name^="consentService-iFrame"]')
      .contentFrame()
      .getByRole('button', { name: /^(Allow|Zulassen)$/ });
    await this.page.addLocatorHandler(allow, (button) => button.click());

    // Power Apps sometimes hangs on "Fetching your app ..."; a reload almost always fixes that,
    // so give each attempt a minute and reload once before giving up.
    for (let attempt = 1; ; attempt++) {
      if (attempt === 1) await this.page.goto(env.appUrl);
      else await this.page.reload();
      try {
        await expect(this.input('CompanyName')).toBeVisible({ timeout: 60_000 });
        return;
      } catch (error) {
        if (attempt === 2) throw error;
      }
    }
  }

  /** Types each value character by character (visible in the video), replacing what was there. */
  async fill(data: Partial<ClientData>) {
    for (const [field, value] of Object.entries(data) as [keyof ClientData, string][]) {
      const input = this.input(field);
      await input.clear();
      await input.pressSequentially(value, { delay: pace.typingDelayMs });
      // When Power Apps is busy it can drop a keystroke; set the value directly if that happened.
      const typed = await expect(input).toHaveValue(value, { timeout: 5_000 }).then(() => true, () => false);
      if (!typed) {
        await input.fill(value);
        await expect(input).toHaveValue(value);
      }
    }
  }

  async clear() {
    for (const field of FIELDS) await this.input(field).clear();
  }

  async submit() {
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  /**
   * Clicks Submit even when it's disabled, the way an impatient user would, then gives the app
   * a moment in which it could (wrongly) save. Used to prove that nothing happens.
   */
  async trySubmitAnyway() {
    await this.submitButton.click({ force: true });
    await this.page.waitForTimeout(3_000);
  }

  async expectSuccess() {
    await expect(this.successLabel).toContainText('Thank you', { timeout: 30_000 });
  }
}
