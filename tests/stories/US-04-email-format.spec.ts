import { expect, test, userStory } from '../fixtures';
import { REQUIRED_FIELDS, newClient, pick } from '../utils/testData';

/** Accepted: local-part@domain, where the domain has at least one dot. */
const VALID_EMAILS = ['anna@example.com', 'first.last@mail.example.de', 'anna+clients@example.com'];

/** Declined, with the reason shown in the test title. */
const INVALID_EMAILS: { email: string; reason: string }[] = [
  { email: 'anna.example.com', reason: 'no @' },
  { email: '@example.com', reason: 'no local part' },
  { email: 'anna@', reason: 'no domain' },
  { email: 'anna@example', reason: 'domain without a dot' },
  { email: 'anna@@example.com', reason: 'two @' },
  { email: 'anna maria@example.com', reason: 'a space' },
];

userStory(
  {
    id: 'US-04',
    title: 'Valid e-mail address',
    asA: 'a team member',
    iWant: 'the form to decline a Contact Email that is not in the format local-part@domain',
    soThat: 'we only store e-mail addresses we can actually write to',
  },
  () => {
    test('AC1: a valid e-mail address is accepted', async ({ form, step }) => {
      const client = newClient();

      for (const email of VALID_EMAILS) {
        await step(`When I enter the e-mail "${email}"`, async () => {
          await form.fill({ ...pick(client, REQUIRED_FIELDS), ContactEmail: email });
        });

        await step('Then no error is shown and Submit is enabled', async () => {
          await expect(form.emailError).toBeHidden();
          await expect(form.submitButton).toBeEnabled();
        });
      }
    });

    for (const { email, reason } of INVALID_EMAILS) {
      test(`AC2: "${email}" is declined (${reason})`, async ({ form, sharePoint, step }) => {
        const client = newClient({ ContactEmail: email });

        await step(`When I fill the required fields with the e-mail "${email}"`, async () => {
          await form.fill(pick(client, REQUIRED_FIELDS));
        });

        await step('Then an e-mail error is shown and Submit is disabled', async () => {
          await expect(form.emailError).toBeVisible();
          await expect(form.emailError).toHaveText('Enter a valid e-mail (name@domain.com)');
          await expect(form.submitButton).toBeDisabled();
        });

        await step('When I click Submit anyway', async () => {
          await form.trySubmitAnyway();
        });

        await step('Then nothing is saved in SharePoint', async () => {
          await expect(form.successLabel).toBeHidden();
          expect(await sharePoint.findByCompanyName(client.CompanyName)).toHaveLength(0);
        });
      });
    }
  },
);
