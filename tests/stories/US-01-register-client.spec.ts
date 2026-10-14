import { expect, step, test, userStory } from '../fixtures';
import { COLUMN, FIELDS, REQUIRED_FIELDS, newClient, pick } from '../utils/testData';

userStory(
  {
    id: 'US-01',
    title: 'Register a new client',
    asA: 'sales employee',
    iWant: "to enter a new client's company and contact details in one form",
    soThat: 'the client is recorded in the New Clients list',
  },
  () => {
    test('AC1: all ten fields are saved as typed', async ({ form, sharePoint }) => {
      const client = newClient();

      await step('When I fill in all ten fields', () => form.fill(client));
      await step('And I click Submit', () => form.submit());
      await step('Then the success screen is shown', () => form.expectSuccess());
      await step('And the list has one item whose columns match what I typed', async () => {
        const item = await sharePoint.waitForItem(COLUMN.CompanyName, client.CompanyName);
        for (const field of FIELDS) {
          expect(item[COLUMN[field]], COLUMN[field]).toBe(client[field]);
        }
      });
    });

    test('AC2: the success screen shows the ID of the saved item', async ({ form, sharePoint }) => {
      const client = newClient();

      await step('When I submit a complete client', async () => {
        await form.fill(client);
        await form.submit();
      });
      const shownId = await step('Then the success screen says "Thank you! The client was saved (ID n)."', () =>
        form.expectSuccess(),
      );
      await step('And n is the ID of the saved item', async () => {
        const item = await sharePoint.waitForItem(COLUMN.CompanyName, client.CompanyName);
        expect(shownId).toBe(item.Id);
      });
    });

    test('AC3: only the required fields are enough, optional columns stay empty', async ({ form, sharePoint }) => {
      const client = newClient();

      await step('When I fill in only Company Name, Contact Name and Contact Email', () =>
        form.fill(pick(client, REQUIRED_FIELDS)),
      );
      await step('And I click Submit', () => form.submit());
      await step('Then the success screen is shown', () => form.expectSuccess());
      await step('And the item has the required values and empty optional columns', async () => {
        const item = await sharePoint.waitForItem(COLUMN.CompanyName, client.CompanyName);
        for (const field of FIELDS) {
          if (REQUIRED_FIELDS.includes(field)) {
            expect(item[COLUMN[field]], COLUMN[field]).toBe(client[field]);
          } else {
            // SharePoint returns null for an empty text column
            expect(item[COLUMN[field]] ?? '', COLUMN[field]).toBe('');
          }
        }
      });
    });

    test('AC4: leading and trailing spaces are removed before saving', async ({ form, sharePoint }) => {
      const client = newClient();
      const padded = Object.fromEntries(FIELDS.map((field) => [field, `  ${client[field]}  `])) as typeof client;

      await step('When I fill in every field with spaces before and after the value', () => form.fill(padded));
      await step('And I click Submit', () => form.submit());
      await step('Then the success screen is shown', () => form.expectSuccess());
      await step('And every column is saved without the surrounding spaces', async () => {
        const item = await sharePoint.waitForItem(COLUMN.CompanyName, client.CompanyName);
        for (const field of FIELDS) {
          expect(item[COLUMN[field]], COLUMN[field]).toBe(client[field]);
        }
      });
    });

    test('AC5: a value longer than the list allows shows an error and saves nothing', async ({ form, sharePoint }) => {
      // APP BUG: btnSubmit.OnSelect is IfError(Set(Patch(...)); Reset(...); Navigate(...), Notify(...)).
      // IfError only sees the last expression of the ; chain (Navigate), so a failed Patch is not caught:
      // the app shows Power Apps' own "Network error when using Patch function: ... at most 255 characters",
      // clears the form and opens an empty success screen. Nothing is saved. Remove test.fail() once fixed.
      test.fail();
      const client = newClient();
      // Title allows 255 characters
      const tooLong = client.CompanyName + ' ' + 'x'.repeat(256 - client.CompanyName.length - 1);
      expect(tooLong).toHaveLength(256);

      await step('When I enter a 256-character Company Name and fill in the other required fields', async () => {
        await form.fill({ ...pick(client, REQUIRED_FIELDS), CompanyName: tooLong });
      });
      await step('And I click Submit', () => form.submit());
      await step('Then I see "Could not save the client: ..."', async () => {
        await expect(form.saveError).toBeVisible({ timeout: 30_000 });
      });
      await step('And I stay on the form with my input', async () => {
        await expect(form.input('CompanyName')).toHaveValue(tooLong);
        await expect(form.successMessage).toBeHidden();
      });
      await step('And nothing is saved', async () => {
        await sharePoint.expectNoItem(COLUMN.ContactEmail, client.ContactEmail);
      });
    });
  },
);
