import { expect, test, userStory } from '../fixtures';
import { COLUMN, FIELDS, newClient } from '../utils/testData';

userStory(
  {
    id: 'US-01',
    title: 'Save a new client',
    asA: 'a team member',
    iWant: "to enter a new client's company and contact details in one form",
    soThat: 'they are stored in the SharePoint list "New Clients"',
  },
  () => {
    test('AC1: all entered values are stored in SharePoint', async ({ form, sharePoint, step }) => {
      const client = newClient();

      await step('When I fill in all fields and click Submit', async () => {
        await form.fill(client);
        await form.submit();
        await form.expectSuccess();
      });

      await step('Then exactly one item with all values exists in SharePoint', async () => {
        const items = await sharePoint.waitForCompany(client.CompanyName);
        expect(items).toHaveLength(1);
        for (const field of FIELDS) {
          expect.soft(items[0][COLUMN[field]], COLUMN[field]).toBe(client[field]);
        }
      });
    });

    test('AC2: a confirmation shows the ID of the saved item', async ({ form, sharePoint, step }) => {
      const client = newClient();

      await step('When I submit a new client', async () => {
        await form.fill(client);
        await form.submit();
        await form.expectSuccess();
      });

      await step('Then the confirmation shows "Thank you!" and the SharePoint item ID', async () => {
        const [item] = await sharePoint.waitForCompany(client.CompanyName);
        expect(item, 'saved item in SharePoint').toBeDefined();
        await expect(form.successLabel).toHaveText(`Thank you! The client was saved (ID ${item.Id}).`);
      });
    });
  },
);
