# Rules for working in this repo

Playwright end-to-end tests for the **New Clients Form** canvas app (solution `NewClientsForm`), checked against
the SharePoint list **New Clients**. See `README.md` for commands and `docs/user-stories.md` for what is tested.

## Learn the app from the export, not from memory

- When the app changed, export first: `./scripts/export-solution.ps1 -SolutionName NewClientsForm`, then read
  `git diff src/canvas`. Only published changes are exported.
- Never edit `src/canvas/` or `src/solution/` by hand. They are the export; re-export instead.
- Don't guess control names, formulas or texts. Control names (`data-control-name` inside
  `iframe[name="fullscreen-app-host"]`) are the contract between the app and the tests.

## Tests

- Every control the tests touch goes into the page object `tests/pages/NewClientsPage.ts`.
- One spec per user story: `tests/stories/US-0n-<short-name>.spec.ts`, wrapped in `userStory(...)`.
- One `test('ACn: ...')` per acceptance criterion; loop when an AC has one case per field or example.
- Test bodies are only `step('Given / When / Then ...')` blocks.
- Check saved values in SharePoint (`sharePoint` fixture), not only on screen. "Nothing is saved" = force the click,
  then `expectNoItem` for this test's unique value.
- Test data comes from `tests/utils/testData.ts`; every record starts with `E2E-` in Company Name (Title) so cleanup
  can delete it.
- Update `docs/user-stories.md` (story, ACs, AC → test file table) together with the specs.

## When a test fails

Decide whether the test or the app is wrong. Fix the test only if the test is wrong. If the app is wrong, keep the
test, mark it `test.fail()` with a comment that describes the bug, list it under "Known app bugs" in `README.md`,
and report it to the user (AC, input, what happened, what was expected). Don't bend tests to pass.

## Secrets

The user does every sign-in (`npm run login`). Never ask for passwords, MFA codes or tokens. Never commit `.auth/`
or `.env`, and never record the sign-in in a video.
