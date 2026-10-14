import { test as base, type Page } from '@playwright/test';
import { NewClientsPage } from './pages/NewClientsPage';
import { pace } from './utils/env';
import { SharePointList } from './utils/sharepoint';

type StoryInfo = { id: string; title: string; asA: string; iWant: string; soThat: string };

type TestFixtures = {
  /** The app, opened in a "Given the form is open" step. The final state stays on screen for pace.endPauseMs. */
  form: NewClientsPage;
  /** Remembers the page so step() can draw captions on it. */
  captionPage: void;
};

type WorkerFixtures = {
  /** SharePoint list client. Deletes all E2E- records after the run. */
  sharePoint: SharePointList;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sharePoint: [
    async ({}, use) => {
      const list = await SharePointList.open();
      await use(list);
      const deleted = await list.deleteTestItems();
      if (deleted > 0) console.log(`Cleanup: deleted ${deleted} E2E- item(s) from the list.`);
      await list.dispose();
    },
    { scope: 'worker', auto: true },
  ],

  captionPage: [
    async ({ page }, use) => {
      currentPage = page;
      await use();
      currentPage = undefined;
    },
    { auto: true },
  ],

  form: async ({ page }, use) => {
    const form = new NewClientsPage(page);
    await step('Given the New Clients form is open', () => form.open());
    await use(form);
    await page.waitForTimeout(pace.endPauseMs);
  },
});

export { expect } from '@playwright/test';

let currentPage: Page | undefined;

const CAPTION_ID = 'e2e-step-caption';

/** Shows a caption bar at the bottom of the page, so videos show which story, AC and step is running. */
async function showCaption(page: Page, context: string, text: string) {
  try {
    await page.evaluate(
      ({ id, context, text }) => {
        let bar = document.getElementById(id);
        if (!bar) {
          bar = document.createElement('div');
          bar.id = id;
          Object.assign(bar.style, {
            position: 'fixed',
            left: '0',
            right: '0',
            bottom: '0',
            zIndex: '2147483647',
            pointerEvents: 'none',
            padding: '8px 16px',
            background: 'rgba(20, 20, 20, 0.85)',
            color: '#fff',
            font: '15px/1.4 Segoe UI, sans-serif',
          });
          document.body.appendChild(bar);
        }
        bar.innerHTML = '';
        const head = document.createElement('div');
        head.textContent = context;
        head.style.opacity = '0.7';
        head.style.fontSize = '12px';
        const body = document.createElement('div');
        body.textContent = text;
        bar.append(head, body);
      },
      { id: CAPTION_ID, context, text },
    );
  } catch {
    // A caption must never fail a test (for example while the page navigates)
  }
}


/** A Given / When / Then step: a test.step with a caption bar and a pause in demo mode. */
export async function step<T>(title: string, body: () => Promise<T>): Promise<T> {
  return test.step(title, async () => {
    const info = test.info();
    const context = [...info.titlePath.slice(1, -1), info.title].join(' › ');
    if (currentPage) await showCaption(currentPage, context, title);
    const result = await body();
    if (currentPage) await showCaption(currentPage, context, `✓ ${title}`);
    if (pace.stepPauseMs > 0 && currentPage) await currentPage.waitForTimeout(pace.stepPauseMs);
    return result;
  });
}

/** One user story: a describe block tagged @<id>, with the story text as annotation. */
export function userStory(story: StoryInfo, body: () => void) {
  test.describe(
    `${story.id}: ${story.title}`,
    {
      tag: `@${story.id}`,
      annotation: { type: 'story', description: `As a ${story.asA}, I want ${story.iWant}, so that ${story.soThat}.` },
    },
    body,
  );
}
