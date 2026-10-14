import { test as base } from '@playwright/test';
import { NewClientFormPage } from './pages/NewClientFormPage';
import { showCaption } from './utils/caption';
import { pace } from './utils/env';
import { SharePointList } from './utils/sharepoint';

export { expect } from '@playwright/test';

type TestFixtures = {
  /** The app, already opened on the empty form. */
  form: NewClientFormPage;
  /**
   * A Given / When / Then step: shown in the HTML report and as a caption in the video.
   * Use it instead of test.step in story files.
   */
  step: <T>(title: string, body: () => Promise<T>) => Promise<T>;
};

type WorkerFixtures = {
  /** SharePoint "New Clients" list. Test items (E2E-...) are deleted when the run ends. */
  sharePoint: SharePointList;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sharePoint: [
    async ({}, use) => {
      const list = await SharePointList.open();
      await use(list);
      await list.deleteTestItems();
      await list.dispose();
    },
    // auto: cleanup runs even for stories that never read from SharePoint.
    { scope: 'worker', auto: true },
  ],

  step: async ({ page }, use, testInfo) => {
    // e.g. "US-02: Required fields › AC2: ..." (titlePath = [file, story, test]).
    const heading = testInfo.titlePath.slice(1).join(' › ');
    await use((title, body) =>
      test.step(title, async () => {
        await showCaption(page, heading, title);
        // Deliberate pause (not a wait for state): gives the viewer time to read the caption.
        await page.waitForTimeout(pace.stepPauseMs);
        const result = await body();
        // Show it again in case the step navigated (e.g. opening the app) and the page was replaced.
        await showCaption(page, heading, title);
        return result;
      }),
    );
  },

  form: async ({ page, step }, use) => {
    const form = new NewClientFormPage(page);
    await step('Given the New Clients form is open', () => form.open());
    await use(form);
    // Keep the final state on screen for a moment before the video ends.
    await page.waitForTimeout(pace.endPauseMs);
  },
});

export type UserStory = {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
};

/**
 * Groups the acceptance-criteria tests of one user story.
 * The story text is attached as an annotation and the id as a tag, so the HTML report shows both
 * and a single story can be run with: npx playwright test --grep @US-01
 */
export function userStory(story: UserStory, body: () => void) {
  test.describe(
    `${story.id}: ${story.title}`,
    {
      tag: `@${story.id}`,
      annotation: {
        type: 'User story',
        description: `As ${story.asA}, I want ${story.iWant}, so that ${story.soThat}.`,
      },
    },
    body,
  );
}
