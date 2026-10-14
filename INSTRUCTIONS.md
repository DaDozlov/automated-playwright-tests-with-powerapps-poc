# Instructions: build Playwright end-to-end tests for a Power App

These instructions are for an AI coding agent (Claude Code, Codex, Copilot, Cursor, ...).
Start it in this folder and tell it which app, with the app's web link. You can also paste the link into
the prompt below once, and then just say "Follow INSTRUCTIONS.md for my Power App":

> Follow INSTRUCTIONS.md for my Power App: https://apps.powerapps.com/play/e/<environment-id>/a/<app-id>?tenantId=<tenant-id>

(Web link: make.powerapps.com → Apps → ⋯ next to the app → Details → Web link.)

The result is a repo that exports the published canvas app, describes it as user stories,
and tests every acceptance criterion in a real browser, checked against the app's data source.

---

## Ground rules

- **Treat the app as one you have never seen.** Learn it only from (1) the export of the *published*
  app and (2) the live app in the browser. Don't use earlier versions of this repo from git history,
  and don't guess control names, formulas or texts.
- **Never edit the export** (`src/canvas/`, `src/solution/`) by hand. Re-export instead.
- **Ask the user** for anything you can't find yourself. Ask once, with everything you need in one message.
- **The user does every sign-in.** Start the sign-in command and tell the user what to do. Never ask for
  passwords, MFA codes or tokens. Never put the session (`.auth/`) or `.env` into git or into a video.
- **If a test fails, decide whether the test or the app is wrong.** Fix the test only if the test is wrong.
  If the app is wrong, keep the test, mark it with `test.fail()` and a comment, and report the bug to the user.
- **Work in phases.** After each phase, tell the user in two or three lines what you did and what's next.

## Inputs

The only required input is the app's **web link**. Take it from the user's prompt or, if the prompt has none,
from the example prompt at the top of this file (if it's a real link, not a placeholder). If there is neither,
ask for it before doing anything else. Everything else comes from it:

| Input | Where it comes from |
|---|---|
| App play URL (`APP_URL`) | the web link. Keep `tenantId`, drop `hint` and `sourcetime`, add `&hidenavbar=true`. |
| Environment ID | the web link: `/play/e/<environment-id>/a/<app-id>` |
| App ID | the web link, same path |
| Tenant ID | the web link: `tenantId=<tenant-id>` |
| Solution that contains the app | `pac solution list` (phase 1). Show the user the unmanaged solutions and ask which one contains the app. If none does, ask the user to add the app to one. |
| Data source (`SP_SITE_URL`, `SP_LIST_TITLE`) | the export (phase 1). If it isn't a SharePoint list, see "Other data sources". |

Write the values you have into `.env` as soon as phase 3 creates it.

---

## Phase 1: Export the published app

1. Check the tools and install what's missing. Tell the user what you're about to install and wait for an OK first:
   - Node.js 20 or later (`node -v`). Missing or older: `winget install OpenJS.NodeJS.LTS`
     (macOS: `brew install node`, Linux: the distribution's package manager)
   - Power Platform CLI: `pac` on PATH, or `%LOCALAPPDATA%\Microsoft\PowerAppsCLI\pac.cmd`.
     Missing: `winget install Microsoft.PowerAppsCLI`
     (macOS / Linux: `dotnet tool install --global Microsoft.PowerApps.CLI.Tool`)
   - Git (`git --version`). Missing: `winget install Git.Git`

   A new install may not be on PATH in the running shell. Use its full path, or ask the user to restart the agent.
   If an install fails (no admin rights, blocked by policy), tell the user exactly what to install and stop.
   Playwright and its browser are installed later, in phase 3.
2. If `pac auth list` shows no profile for the environment from the web link, run
   `pac auth create --environment <environment-id>` and ask the user to sign in in the window that opens.
   Then run `pac org who` and check that it shows that environment.
3. Find the solution (see "Inputs").
4. Write `scripts/export-solution.ps1` (parameter `-SolutionName`) that:
   - finds `pac` on PATH or in the default install folder
   - runs `pac solution export --name <solution> --path out/<solution>.zip --overwrite`
   - runs `pac solution unpack --zipfile out/<solution>.zip --folder src/solution --packagetype Unmanaged --allowDelete --allowWrite`,
     retrying up to 3 times (the zip can be locked right after the download)
   - copies every `src/solution/CanvasApps/*.msapp` to a `.zip`, expands it into `out/<name>/`, and copies
     its `Src/*` to `src/canvas/<name without _DocumentUri>/`, excluding `_EditorState.pa.yaml`
     (Studio view state only)
5. Run it. Then read every `src/canvas/<app>/*.pa.yaml` and write down:
   - screens, and how the user moves between them (`Navigate`)
   - every control: name, type, text, hint text, default value
   - every rule: `DisplayMode`, `Visible`, validation formulas (`IsBlank`, `IsMatch`, `Trim`, ...)
   - what each button's `OnSelect` does: `Patch` / `SubmitForm` / `Remove`, which columns, which variables
   - messages the user can see: labels, `Notify` texts
6. Find the data source: the name used in `Patch(...)` and its details in `out/<app>/References/`
   (for example `DataSources.json`). For SharePoint, note the site URL, list title and column names.
7. Open the live app once (Playwright or the user's browser) and check that controls carry
   `data-control-name="<control name>"` inside the iframe `iframe[name="fullscreen-app-host"]`.

Summarise the app for the user and point out controls with default names (`TextInput1`, ...).
Suggest renaming them in Studio, then publishing and exporting again: control names are the contract for the tests.

## Phase 2: User stories

Write `docs/user-stories.md` from what the export shows:

- One story per user goal: `US-01`, `US-02`, ... with *As a ..., I want ..., so that ...*.
- Numbered acceptance criteria (`AC1`, `AC2`, ...), each one checkable. Cover:
  - the happy path: every field is saved to the data source and matches what was typed
  - what the user sees after saving
  - each required field: missing, only spaces, filled in and then cleared
  - each validation rule, with valid and invalid examples. Look for cases the formula gets wrong.
  - navigation (for example "Submit another" opens an empty form)
- A table per story: AC → test file.
- A section "Adding a story" with the conventions below.

**Show the stories to the user and wait for approval before writing tests.**

## Phase 3: Playwright project

```
npm init -y
npm install -D @playwright/test typescript @types/node dotenv cross-env
npx playwright install chromium
```

- `package.json` scripts: `test`, `test:headed`, `test:demo` (`cross-env DEMO=1 playwright test --headed`),
  `login` (`playwright test --project=setup`), `report` (`playwright show-report`).
- `tsconfig.json`: strict, `NodeNext`, `noEmit`, includes `playwright.config.ts` and `tests/**/*.ts`.
- `.env.example` with `APP_URL`, `SP_SITE_URL`, `SP_LIST_TITLE`, and optional `TEST_USER` / `TEST_PASSWORD`
  (only for accounts without MFA). Copy it to `.env` and fill in the values you know.
- `.gitignore`: `out/`, `node_modules/`, `.auth/`, `test-results/`, `playwright-report/`, `blob-report/`, `.env`.
- `tests/utils/env.ts`: loads `.env`, throws a clear error for missing values, exports `AUTH_FILE = '.auth/user.json'`
  and a `pace` object (typing delay, `slowMo`, pause per step, pause at the end), slower when `DEMO=1`.
- `playwright.config.ts`:
  - `timeout: 180_000`, `expect.timeout: 20_000` (Power Apps loads slowly)
  - `workers: 1`, `fullyParallel: false` (the tests share one data source)
  - reporters `list` and `html`, `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`
  - `video: 'on'` at the viewport size (1440x900)
  - project `setup` (`auth.setup.ts`, headed when there is no `TEST_USER`, **video off**)
  - project `chromium` (`*.spec.ts`, depends on `setup`, `storageState: AUTH_FILE`, `slowMo` from `pace`)

## Phase 4: Sign-in

`tests/setup/auth.setup.ts`:

- Skip when `.auth/user.json` is younger than 8 hours, unless `FORCE_LOGIN` is set.
- Open `APP_URL`. With `TEST_USER`, fill in the Microsoft login form (email, password, "Stay signed in?").
  Without it, print a message and wait up to 10 minutes for the user to sign in (MFA works).
- Wait until the first input of the app is visible.
- Visit the SharePoint site once, so its cookies are saved too.
- Save `storageState`, but **remove localStorage entries starting with `PAAppLoadCache`**. Otherwise every test
  runs the app version from sign-in time instead of the latest published one.

Run `npm run login` and ask the user to sign in.

## Phase 5: Page object

`tests/pages/<App>Page.ts`, one class per app (or per screen for bigger apps):

- `app = page.frameLocator('iframe[name="fullscreen-app-host"]')`
- `control(name)` → `[data-control-name="<name>"]` inside the app. Text inputs: `control(name).locator('input, textarea')`.
  Buttons: `control(name).getByRole('button')`.
- `open()`:
  - register `page.addLocatorHandler` for the consent prompt "Allow <app> to access your data?":
    `iframe[name^="consentService-iFrame"]`, button matching `/^(Allow|Zulassen)$/` (add the user's language)
  - `goto(APP_URL)`, wait up to 60 s for the first input. If it doesn't appear ("Fetching your app..." hang),
    reload once and wait again.
- `fill(data)`: clear, then `pressSequentially` with `pace.typingDelayMs` so typing is visible in the video.
  Check the value. If a keystroke was dropped, fall back to `fill()`.
- `submit()` (expects the button to be enabled), `trySubmitAnyway()` (`click({ force: true })`, then wait 3 s),
  `expectSuccess()`.
- Dropdowns, combo boxes, date pickers, toggles and galleries each need their own helper. Inspect them in the
  live app first. In a gallery, pick the row before the control.

`tests/utils/testData.ts`: a `ClientData`-style type whose keys match the control names (`txt<Key>`), a map
key → data source column, the list of fields in form order, the required fields, `pick()`, and a factory that
creates unique data. **Every record created by tests starts with `E2E-`** in its main column.

## Phase 6: Data source client

`tests/utils/sharepoint.ts`, a small SharePoint REST client:

- `request.newContext({ storageState: AUTH_FILE, extraHTTPHeaders: { Accept: 'application/json;odata=nometadata' } })`.
  It reuses the signed-in cookies, so no app registration is needed.
- `/_api/web/lists/getbytitle('<list>')/fields?$filter=Hidden eq false and ReadOnlyField eq false` maps
  display names to internal names (`Registration Number` → `Registration_x0020_Number`). `Title` is always `Title`,
  whatever its display name is.
- `findBy(column, value)` returns items keyed by display name, plus `Id`. Escape `'` as `''` in OData strings.
- `waitFor...(value)` polls every second for up to 20 s (SharePoint can lag).
- `deleteTestItems()`: items where `startswith(Title,'E2E-')`, deleted with a form digest from `/_api/contextinfo`
  (`X-HTTP-Method: DELETE`, `IF-MATCH: *`).

**Other data sources:** for Dataverse, SQL, Excel and so on, write the same three helpers (find, wait, delete test
records) for that source, and ask the user how the tests may authenticate. Dataverse usually needs an access token.

## Phase 7: Fixtures and story specs

`tests/fixtures.ts`:

- worker fixture `sharePoint` (`auto: true`): opens the client and, after the run, deletes the test records
- `step(title, body)`: wraps `test.step`, shows a caption bar (story › AC, step text) at the bottom of the page
  before and after the step, and pauses `pace.stepPauseMs`. Caption: fixed position, `pointer-events: none`,
  highest z-index, never fails a test.
- `form`: opens the app in a `Given ... is open` step, and keeps the final state on screen for `pace.endPauseMs`
- `userStory({ id, title, asA, iWant, soThat }, body)`: `test.describe('<id>: <title>')` with tag `@<id>` and the
  story text as annotation

`tests/stories/US-0x-<short-name>.spec.ts`, one per story:

- one `test('ACn: ...')` per acceptance criterion. Use a loop when an AC has one case per field or example.
- the body is only `step('Given / When / Then ...')` blocks
- "Nothing is saved" means: force the click, then check the data source returns nothing for this test's unique value
- check saved values in the data source, not only on the screen

## Phase 8: Run, fix, document

1. Run one story at a time: `npx playwright test --grep "@US-01"`. Then run everything.
2. For each failure, decide test vs app (see the ground rules). Report app bugs to the user with the AC, the input,
   what happened and what was expected.
3. Write `README.md`: what the app does, repo layout, how to run (`npm install`, `.env`, `npm test`, `npm run report`,
   `npm run test:demo`, `--grep`), sign-in and cleanup notes.
4. Write `docs/app-setup.md`: how to export, the data source schema (columns, types, required), and how to import
   the solution into another environment (`pac solution pack` / `pac solution import`).
5. Write `CLAUDE.md` (and/or `AGENTS.md`) with the rules for future work: export first, never edit `src/` by hand,
   new controls go into the page object, one spec per story and one test per AC, report app bugs instead of
   bending tests.
6. Tell the user: number of tests, passed / failed, app bugs found, and how to open the report.

## When the app changes later

Publish → `./scripts/export-solution.ps1` → `git diff src/canvas` → update stories and tests for what changed → run.
