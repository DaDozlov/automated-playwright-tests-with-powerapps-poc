import { expect, test, userStory } from '../fixtures';
import { FIELDS, newClient } from '../utils/testData';

userStory(
  {
    id: 'US-03',
    title: 'Enter several clients in a row',
    asA: 'a team member',
    iWant: 'to start the next client right after saving one',
    soThat: 'I can enter several clients quickly',
  },
  () => {
    test('AC1: "Submit another" opens an empty form', async ({ form, step }) => {
      await step('Given I have just saved a client', async () => {
        await form.fill(newClient());
        await form.submit();
        await form.expectSuccess();
      });

      await step('When I click "Submit another"', async () => {
        await form.submitAnotherButton.click();
      });

      await step('Then all fields are empty and Submit is disabled', async () => {
        for (const field of FIELDS) {
          await expect(form.input(field), field).toHaveValue('');
        }
        await expect(form.submitButton).toBeDisabled();
      });
    });
  },
);
