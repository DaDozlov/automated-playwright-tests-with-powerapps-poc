import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { env, pace } from '../utils/env';
import { FIELDS, type ClientData, type ClientField } from '../utils/testData';

/** The "New Clients Form" canvas app: FormScreen and SuccessScreen. */
export class NewClientsPage {
  readonly app: FrameLocator;

  constructor(readonly page: Page) {
    this.app = page.frameLocator('iframe[name="fullscreen-app-host"]');
  }

  /** A control by its name in Power Apps Studio. */
  control(name: string): Locator {
    return this.app.locator(`[data-control-name="${name}"]`);
  }

  input(field: ClientField): Locator {
    return this.control(`txt${field}`).locator('input, textarea');
  }

  get submitButton(): Locator {
    return this.control('btnSubmit').getByRole('button');
  }

  get submitAnotherButton(): Locator {
    return this.control('btnSubmitAnother').getByRole('button');
  }

  get emailError(): Locator {
    return this.control('lblContactEmailError');
  }

  get successMessage(): Locator {
    return this.control('lblSuccess');
  }

  /** The Notify banner the app shows when Patch fails. Power Apps draws notifications outside the app iframe. */
  get saveError(): Locator {
    return this.page.getByText(/Could not save the client: /);
  }

  label(name: string): Locator {
    return this.control(name);
  }

  async open() {
    // "Allow <app> to access your data?" appears on first use of a connection
    const consent = this.page.frameLocator('iframe[name^="consentService-iFrame"]');
    await this.page.addLocatorHandler(consent.getByRole('button', { name: /^(Allow|Zulassen)$/ }), async (button) => {
      await button.click();
    });

    // Power Apps sometimes hangs on "Fetching your app..." (mostly on a cold start); loading it again fixes it
    const firstInput = this.input(FIELDS[0]);
    const attempts = 3;
    for (let attempt = 1; ; attempt++) {
      await this.page.goto(env.appUrl);
      try {
        await firstInput.waitFor({ state: 'visible', timeout: 45_000 });
        return;
      } catch (error) {
        if (attempt === attempts) throw error;
      }
    }
  }

  /** Types each given field the way a user would. */
  async fill(data: Partial<ClientData>) {
    for (const field of FIELDS) {
      const value = data[field];
      if (value === undefined) continue;
      await this.setValue(field, value);
    }
  }

  async setValue(field: ClientField, value: string) {
    const input = this.input(field);
    await input.click();
    await input.fill('');
    await input.pressSequentially(value, { delay: pace.typingDelayMs });
    if ((await input.inputValue()) !== value) {
      // A keystroke got lost while the app was busy
      await input.fill(value);
    }
    await expect(input).toHaveValue(value);
  }

  async clear(field: ClientField) {
    const input = this.input(field);
    await input.click();
    await input.fill('');
    await expect(input).toHaveValue('');
    // Leave the field so the app re-evaluates its rules
    await input.press('Tab');
  }

  /** Clicks Submit, which must be enabled. */
  async submit() {
    await this.blur();
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  /** Clicks Submit even if it is disabled, to prove that nothing gets saved. */
  async trySubmitAnyway() {
    await this.blur();
    await this.submitButton.click({ force: true });
    await this.page.waitForTimeout(3_000);
  }

  /** Waits for the success screen and returns the item ID it shows. */
  async expectSuccess(): Promise<number> {
    await expect(this.successMessage).toHaveText(/Thank you! The client was saved \(ID \d+\)\./, { timeout: 30_000 });
    const text = (await this.successMessage.textContent()) ?? '';
    return Number(/\(ID (\d+)\)/.exec(text)?.[1]);
  }

  async submitAnother() {
    await this.submitAnotherButton.click();
    await expect(this.input(FIELDS[0])).toBeVisible();
  }

  /** Text inputs commit their value on blur; move focus away before reading rules. */
  async blur() {
    await this.control('lblTitle').click();
  }
}
