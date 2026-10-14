import { expect, step, test, userStory } from '../fixtures';
import { COLUMN, LABEL, REQUIRED_FIELDS, newClient, type ClientField } from '../utils/testData';

/** A column that identifies this test's record even when the field under test is left empty. */
function lookupFor(field: ClientField): ClientField {
  return field === 'ContactEmail' ? 'RegistrationNumber' : 'ContactEmail';
}

userStory(
  {
    id: 'US-02',
    title: 'Required fields',
    asA: 'sales employee',
    iWant: 'the form to stop me from submitting without company name, contact name and contact e-mail',
    soThat: 'every client in the list can be identified and contacted',
  },
  () => {
    test('AC1: Submit is disabled on an empty form', async ({ form }) => {
      await step('Then Submit is disabled', () => expect(form.submitButton).toBeDisabled());
    });

    for (const field of REQUIRED_FIELDS) {
      test(`AC2: ${LABEL[field]} missing disables Submit and saves nothing`, async ({ form, sharePoint }) => {
        const client = newClient({ [field]: '' });

        await step(`When I fill in every field except ${LABEL[field]}`, () => form.fill(client));
        await step('Then Submit is disabled', async () => {
          await form.blur();
          await expect(form.submitButton).toBeDisabled();
        });
        await step('When I force a click on Submit', () => form.trySubmitAnyway());
        await step('Then nothing is saved', async () => {
          await expect(form.successMessage).toBeHidden();
          const lookup = lookupFor(field);
          await sharePoint.expectNoItem(COLUMN[lookup], client[lookup]);
        });
      });
    }

    for (const field of REQUIRED_FIELDS) {
      test(`AC3: ${LABEL[field]} with only spaces disables Submit and saves nothing`, async ({ form, sharePoint }) => {
        const client = newClient({ [field]: '   ' });

        await step(`When I fill in every field and type only spaces into ${LABEL[field]}`, () => form.fill(client));
        await step('Then Submit is disabled', async () => {
          await form.blur();
          await expect(form.submitButton).toBeDisabled();
        });
        await step('When I force a click on Submit', () => form.trySubmitAnyway());
        await step('Then nothing is saved', async () => {
          await expect(form.successMessage).toBeHidden();
          const lookup = lookupFor(field);
          await sharePoint.expectNoItem(COLUMN[lookup], client[lookup]);
        });
      });
    }

    for (const field of REQUIRED_FIELDS) {
      test(`AC4: clearing ${LABEL[field]} after filling the form disables Submit again`, async ({ form }) => {
        const client = newClient();

        await step('When I fill in every field', () => form.fill(client));
        await step('Then Submit is enabled', async () => {
          await form.blur();
          await expect(form.submitButton).toBeEnabled();
        });
        await step(`When I clear ${LABEL[field]}`, () => form.clear(field));
        await step('Then Submit is disabled again', async () => {
          await form.blur();
          await expect(form.submitButton).toBeDisabled();
        });
      });
    }

    test('AC5: required fields are marked with * and the hint explains it', async ({ form }) => {
      await step('Then the hint "Fields marked * are required." is shown', () =>
        expect(form.control('lblRequiredHint')).toHaveText('Fields marked * are required.'),
      );
      for (const field of REQUIRED_FIELDS) {
        await step(`And the label "${LABEL[field]}" ends with *`, () =>
          expect(form.label(`lbl${field}`)).toHaveText(`${LABEL[field]} *`),
        );
      }
    });
  },
);
