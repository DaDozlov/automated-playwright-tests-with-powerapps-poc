import { expect, step, test, userStory } from '../fixtures';
import { COLUMN, FIELDS, newClient } from '../utils/testData';

userStory(
  {
    id: 'US-04',
    title: 'Submit another client',
    asA: 'sales employee',
    iWant: 'to start a new, empty form right after saving',
    soThat: 'I can enter several clients in a row',
  },
  () => {
    test('AC1: "Submit another" opens an empty form with Submit disabled', async ({ form }) => {
      await step('Given I have just saved a client', async () => {
        await form.fill(newClient());
        await form.submit();
        await form.expectSuccess();
      });
      await step('When I click "Submit another"', () => form.submitAnother());
      await step('Then all ten fields are empty', async () => {
        for (const field of FIELDS) {
          await expect(form.input(field), field).toHaveValue('');
        }
      });
      await step('And Submit is disabled', () => expect(form.submitButton).toBeDisabled());
    });

    test('AC2: a second client is saved as a separate item', async ({ form, sharePoint }) => {
      const first = newClient();
      const second = newClient();

      const firstId = await step('Given I have just saved a first client', async () => {
        await form.fill(first);
        await form.submit();
        return form.expectSuccess();
      });
      await step('When I click "Submit another" and submit a second client', async () => {
        await form.submitAnother();
        await form.fill(second);
        await form.submit();
      });
      const secondId = await step('Then the success screen shows a new ID', async () => {
        const id = await form.expectSuccess();
        expect(id).not.toBe(firstId);
        return id;
      });
      await step('And both items are in the list with their own values', async () => {
        const firstItem = await sharePoint.waitForItem(COLUMN.CompanyName, first.CompanyName);
        const secondItem = await sharePoint.waitForItem(COLUMN.CompanyName, second.CompanyName);
        expect(firstItem.Id).toBe(firstId);
        expect(secondItem.Id).toBe(secondId);
        for (const field of FIELDS) {
          expect(firstItem[COLUMN[field]], `first: ${COLUMN[field]}`).toBe(first[field]);
          expect(secondItem[COLUMN[field]], `second: ${COLUMN[field]}`).toBe(second[field]);
        }
      });
    });
  },
);
