import { expect, test, userStory } from '../fixtures';
import { COLUMN, FIELDS, REQUIRED_FIELDS, newClient, pick } from '../utils/testData';

userStory(
  {
    id: 'US-02',
    title: 'Required fields',
    asA: 'a team member',
    iWant: 'the form to stop me from submitting without Company Name, Contact Name and Contact Email',
    soThat: 'every saved client can be identified and contacted',
  },
  () => {
    test('AC1: Submit is disabled on the empty form', async ({ form, step }) => {
      await step('Then Submit is disabled', async () => {
        await expect(form.submitButton).toBeDisabled();
      });
    });

    for (const missing of REQUIRED_FIELDS) {
      test(`AC2: nothing is saved when ${COLUMN[missing]} is missing`, async ({ form, sharePoint, step }) => {
        const client = newClient();

        await step(`When I fill in every field except ${COLUMN[missing]}`, async () => {
          await form.fill(pick(client, FIELDS.filter((f) => f !== missing)));
        });

        await step('Then Submit is disabled', async () => {
          await expect(form.submitButton).toBeDisabled();
        });

        await step('When I click Submit anyway', async () => {
          await form.trySubmitAnyway();
        });

        await step('Then the form stays open and nothing is saved in SharePoint', async () => {
          await expect(form.input('CompanyName')).toBeVisible();
          await expect(form.successLabel).toBeHidden();
          // Registration Number is unique per test client and filled in every case here.
          expect(await sharePoint.findBy('Registration Number', client.RegistrationNumber)).toHaveLength(0);
        });
      });
    }

    test('AC3: a required field with only spaces counts as empty', async ({ form, step }) => {
      const client = newClient();

      await step('When I fill the required fields but Contact Email is only spaces', async () => {
        await form.fill({ ...pick(client, REQUIRED_FIELDS), ContactEmail: '   ' });
      });

      await step('Then Submit is disabled', async () => {
        await expect(form.submitButton).toBeDisabled();
      });
    });

    test('AC4: clearing a required field disables Submit again', async ({ form, step }) => {
      await step('Given all required fields are filled and Submit is enabled', async () => {
        await form.fill(pick(newClient(), REQUIRED_FIELDS));
        await expect(form.submitButton).toBeEnabled();
      });

      await step('When I clear Contact Name', async () => {
        await form.input('ContactName').clear();
      });

      await step('Then Submit is disabled again', async () => {
        await expect(form.submitButton).toBeDisabled();
      });
    });

    test('AC5: filling only the required fields is enough to save', async ({ form, sharePoint, step }) => {
      const client = newClient();

      await step('When I fill only the required fields and click Submit', async () => {
        await form.fill(pick(client, REQUIRED_FIELDS));
        await form.submit();
        await form.expectSuccess();
      });

      await step('Then the client is stored in SharePoint', async () => {
        const items = await sharePoint.waitForCompany(client.CompanyName);
        expect(items).toHaveLength(1);
        expect(items[0]['Contact Email']).toBe(client.ContactEmail);
      });
    });
  },
);
