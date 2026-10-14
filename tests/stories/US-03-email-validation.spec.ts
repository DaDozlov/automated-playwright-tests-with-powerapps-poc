import { expect, step, test, userStory } from '../fixtures';
import { COLUMN, newClient } from '../utils/testData';

const ERROR_TEXT = 'Enter a valid e-mail (name@domain.com)';

/** Valid addresses; `saved` is what the list must contain. */
const VALID = [
  { typed: 'name@domain.com', saved: 'name@domain.com' },
  { typed: 'first.last@sub.domain.co.uk', saved: 'first.last@sub.domain.co.uk' },
  { typed: 'name+tag@domain.io', saved: 'name+tag@domain.io' },
  { typed: '  name@domain.com  ', saved: 'name@domain.com' },
];

const INVALID = ['name', 'name@', '@domain.com', 'name@domain', 'name@@domain.com', 'na me@domain.com', 'name@domain.', 'name@.com'];

/**
 * Invalid addresses that look like they could slip through the app's pattern [^@\s]+@[^@\s.]+(\.[^@\s.]+)+.
 * `appBug: true` = the current app accepts it.
 */
const INVALID_BUT_MATCHING = [
  { value: 'name..x@domain.com', why: 'two dots in a row', appBug: true },
  { value: '.name@domain.com', why: 'leading dot', appBug: true },
  { value: 'name@domain..com', why: 'two dots in the domain', appBug: false },
  { value: 'name@-domain.com', why: 'domain starts with a hyphen', appBug: true },
  { value: 'name@do_main.com', why: 'underscore in the domain', appBug: true },
];

userStory(
  {
    id: 'US-03',
    title: 'Contact e-mail validation',
    asA: 'sales employee',
    iWant: 'to be told when the contact e-mail is not a valid address',
    soThat: "we don't save clients we cannot reach",
  },
  () => {
    for (const { typed, saved } of VALID) {
      test(`AC1: "${typed}" is accepted and saved`, async ({ form, sharePoint }) => {
        const client = newClient({ ContactEmail: typed });

        await step(`When I fill in the form with Contact Email "${typed}"`, () => form.fill(client));
        await step('Then no e-mail error is shown and Submit is enabled', async () => {
          await form.blur();
          await expect(form.emailError).toBeHidden();
          await expect(form.submitButton).toBeEnabled();
        });
        await step('When I click Submit', () => form.submit());
        await step(`Then the item is saved with Contact Email "${saved}"`, async () => {
          await form.expectSuccess();
          const item = await sharePoint.waitForItem(COLUMN.CompanyName, client.CompanyName);
          expect(item[COLUMN.ContactEmail]).toBe(saved);
        });
      });
    }

    for (const value of INVALID) {
      test(`AC2: "${value}" shows the error and saves nothing`, async ({ form, sharePoint }) => {
        const client = newClient({ ContactEmail: value });

        await step(`When I fill in the form with Contact Email "${value}"`, () => form.fill(client));
        await step(`Then I see "${ERROR_TEXT}" and Submit is disabled`, async () => {
          await form.blur();
          await expect(form.emailError).toBeVisible();
          await expect(form.emailError).toHaveText(ERROR_TEXT);
          await expect(form.submitButton).toBeDisabled();
        });
        await step('When I force a click on Submit', () => form.trySubmitAnyway());
        await step('Then nothing is saved', async () => {
          await expect(form.successMessage).toBeHidden();
          await sharePoint.expectNoItem(COLUMN.CompanyName, client.CompanyName);
        });
      });
    }

    test('AC3: no error while the e-mail field is empty', async ({ form }) => {
      await step('Then no e-mail error is shown on the empty form', () => expect(form.emailError).toBeHidden());
      await step('When I type an e-mail and clear it again', async () => {
        await form.setValue('ContactEmail', 'name');
        await form.clear('ContactEmail');
      });
      await step('Then no e-mail error is shown', async () => {
        await form.blur();
        await expect(form.emailError).toBeHidden();
      });
    });

    test('AC4: fixing an invalid address hides the error and enables Submit', async ({ form }) => {
      const client = newClient({ ContactEmail: 'name@domain' });

      await step('When I fill in the form with Contact Email "name@domain"', () => form.fill(client));
      await step('Then the e-mail error is shown and Submit is disabled', async () => {
        await form.blur();
        await expect(form.emailError).toBeVisible();
        await expect(form.submitButton).toBeDisabled();
      });
      await step('When I correct it to "name@domain.com"', () => form.setValue('ContactEmail', 'name@domain.com'));
      await step('Then the error is hidden and Submit is enabled', async () => {
        await form.blur();
        await expect(form.emailError).toBeHidden();
        await expect(form.submitButton).toBeEnabled();
      });
    });

    for (const { value, why, appBug } of INVALID_BUT_MATCHING) {
      test(`AC5: "${value}" (${why}) is rejected`, async ({ form, sharePoint }) => {
        // APP BUG: the e-mail pattern only forbids @, whitespace and (in the domain) dots, so this address
        // passes: no error, Submit enabled, and it is saved. Remove test.fail() once the pattern is fixed.
        test.fail(appBug, 'App accepts this invalid e-mail address');
        const client = newClient({ ContactEmail: value });

        await step(`When I fill in the form with Contact Email "${value}"`, () => form.fill(client));
        await step(`Then I see "${ERROR_TEXT}" and Submit is disabled`, async () => {
          await form.blur();
          await expect(form.emailError).toBeVisible();
          await expect(form.submitButton).toBeDisabled();
        });
        await step('When I force a click on Submit', () => form.trySubmitAnyway());
        await step('Then nothing is saved', async () => {
          await sharePoint.expectNoItem(COLUMN.CompanyName, client.CompanyName);
        });
      });
    }
  },
);
