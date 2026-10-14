# new-clients-form-powerapps

A Canvas Power App where team members enter a new client's company and contact details. Each submission is saved as an item in the SharePoint list **New Clients**. The app is covered by end-to-end Playwright tests written as user stories.

- [docs/user-stories.md](docs/user-stories.md): what the app must do, and which test covers each point
- [docs/app-setup.md](docs/app-setup.md): exporting the app into the repo, the SharePoint list, and rebuilding the app

## Repo layout

```
src/canvas/                 exported source of the published app (*.pa.yaml), never edited by hand
src/solution/               exported solution, for importing into another environment
scripts/export-solution.ps1 refreshes src/ from Power Platform
tests/
  stories/                  one spec per user story, one test per acceptance criterion
  pages/                    page object for the app (locators by control name)
  utils/                    env settings, test data, SharePoint REST client
  setup/auth.setup.ts       signs in once and saves the session
  fixtures.ts               `form` and `sharePoint` fixtures, `userStory()` helper
docs/                       user stories and setup guide
```

## Running the tests

```powershell
npm install
npx playwright install chromium
copy .env.example .env         # fill in APP_URL and SP_SITE_URL
npm test                       # first run opens a browser: sign in (MFA is fine)
npm run report                 # HTML report with steps and a video per test
npm run test:demo              # slower, in a visible browser, for presenting
npx playwright test --grep "@US-02"   # a single user story
```

- The sign-in is saved in `.auth/user.json` (git-ignored) and reused for 8 hours. To refresh it: `$env:FORCE_LOGIN=1; npm run login`.
- Every test records a video (`test-results/<test>/video.webm`, also shown in the report), with a caption showing the current story step.
- Companies created by the tests start with `E2E-` and are deleted from SharePoint after the run.
- For unattended runs (CI), set `TEST_USER` and `TEST_PASSWORD` in `.env` to an account without MFA.
