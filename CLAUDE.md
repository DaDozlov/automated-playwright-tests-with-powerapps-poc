# CLAUDE.md

Power Apps canvas app "New Clients" (SharePoint list "New Clients") with Playwright end-to-end tests written as user stories.

## Where knowledge about the app comes from
- Treat the app as an existing app you don't have the source of. Learn it only from:
  1. the export of the **published** app: run `./scripts/export-solution.ps1`, then read `src/canvas/<app>/*.pa.yaml`
     (control names, formulas, texts, visibility rules), and
  2. the live app in the browser (`APP_URL` in `.env`); controls carry `data-control-name="<name>"`.
- Always export first, so `src/canvas/` matches what is published. Never edit `src/canvas/` or `src/solution/` by hand.
- `pac` may not be on PATH; the script falls back to `%LOCALAPPDATA%\Microsoft\PowerAppsCLI\pac.cmd`.
  If it's not signed in: `pac auth create --environment 143dbdf0-8582-e53c-b232-5ff8e209115d` (opens a sign-in window for the user).

## Tests
- Conventions: `docs/user-stories.md` ("Adding a story"); one spec per story in `tests/stories/`, one test per AC,
  Given/When/Then via the `step` fixture, `form` and `sharePoint` fixtures from `tests/fixtures.ts`.
- New controls go into the page object `tests/pages/NewClientFormPage.ts`, located by control name.
- Run: `npx playwright test --grep "@US-0x"`. The first run in 8 hours opens a sign-in window (the user signs in, MFA ok).
- Tests run against the published app and real SharePoint data; test companies start with `E2E-` and are cleaned up.
- If a test fails, decide whether the test or the app is wrong; report app bugs instead of bending the test.
