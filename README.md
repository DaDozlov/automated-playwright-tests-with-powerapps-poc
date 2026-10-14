# New Clients Form: Playwright end-to-end tests

End-to-end tests for the **New Clients Form** canvas app (Power Apps). The tests drive the published app in a real
browser and check every saved value in the SharePoint list the app writes to.

## What the app does

A sales employee enters a new client: company name, registration number, industry, website, country, contact name,
contact e-mail, contact phone, address and notes. Company name, contact name and a valid contact e-mail are required;
until then **Submit** is disabled. Submit saves one item to the SharePoint list **New Clients** and shows
"Thank you! The client was saved (ID *n*)." with a **Submit another** button.

The behaviour is written down as user stories with acceptance criteria in [docs/user-stories.md](docs/user-stories.md).

## Repo layout

| Path | What it is |
|---|---|
| `src/solution/` | The unpacked `NewClientsForm` solution (export, don't edit) |
| `src/canvas/ncf_newclients_834b2/` | The app's screens as `*.pa.yaml` (export, don't edit) |
| `scripts/export-solution.ps1` | Exports the published solution and refreshes `src/` |
| `docs/user-stories.md` | User stories, acceptance criteria, AC → test file |
| `docs/app-setup.md` | Export, data source schema, importing into another environment |
| `tests/setup/auth.setup.ts` | Sign-in; saves the session to `.auth/user.json` |
| `tests/pages/NewClientsPage.ts` | Page object: every control the tests use |
| `tests/utils/` | `.env` loading, test data, SharePoint REST client |
| `tests/fixtures.ts` | `form`, `sharePoint`, `step()`, `userStory()` |
| `tests/stories/US-0x-*.spec.ts` | One spec per story, one test per acceptance criterion |

## Running the tests

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env   # then fill in APP_URL, SP_SITE_URL, SP_LIST_TITLE
npm test                      # signs in first if needed, then runs everything
npm run report                # opens the HTML report (videos, screenshots, steps)
```

| Command | What it does |
|---|---|
| `npm test` | All tests, headless |
| `npm run test:headed` | All tests in a visible browser |
| `npm run test:demo` | Visible and slowed down, with a caption bar for each step. Good for recording |
| `npx playwright test --grep "@US-03"` | One story |
| `npx playwright test --grep "AC2"` | One acceptance criterion across stories |
| `npm run login` | Sign in again (add `FORCE_LOGIN=1` to ignore a fresh session) |

Every test records a video (1440x900). Videos, traces and screenshots end up in `test-results/` and in the report.

## Sign-in

`npm run login` (and the first `npm test`) opens a browser with the app. Sign in yourself; MFA is fine. The session
is saved to `.auth/user.json` and reused for 8 hours. It also holds the SharePoint cookies the tests use to read and
clean up the list, so no app registration is needed. For an account without MFA you can set `TEST_USER` and
`TEST_PASSWORD` in `.env` to sign in automatically.

`.auth/` and `.env` are git-ignored. Never commit them, and never record the sign-in (the setup project has video off).

## Test data and cleanup

Every record the tests create has a Company Name (list column Title) starting with `E2E-`. After each run, the
`sharePoint` fixture deletes all items whose Title starts with `E2E-`. If a run is interrupted, the next run cleans up.

## Known app bugs

Tests for these are marked `test.fail()`. They pass while the bug exists and fail when the bug is fixed, so you
know to remove the mark.

- **US-01 AC5:** a failed save is not handled. With a value over 255 characters, the user sees Power Apps' own
  "Network error when using Patch function: …", the form is cleared and an empty success screen opens.
- **US-03 AC5:** the e-mail check accepts `name..x@domain.com`, `.name@domain.com`, `name@-domain.com` and
  `name@do_main.com`.

## When the app changes

Publish in Studio → `./scripts/export-solution.ps1 -SolutionName NewClientsForm` → `git diff src/canvas` →
update `docs/user-stories.md`, the page object and the specs → `npm test`.
