# User stories

Each story has one spec file in [tests/stories/](../tests/stories/), and each acceptance criterion (AC) is one test.
Test titles start with the AC number, and each story is tagged with its id. To run a single story:

```powershell
npx playwright test --grep "@US-01"
```

In the HTML report (`npm run report`), every test shows its story as an annotation, its Given / When / Then steps, and a video.
In the video, a caption at the bottom shows the story, the criterion and the current step, and the fields are typed in visibly.
For presenting, `npm run test:demo` runs everything slower in a visible browser.

---

## US-01: Save a new client

> As a team member, I want to enter a new client's company and contact details in one form, so that they are stored in the SharePoint list "New Clients".

| AC | Acceptance criterion | Test |
|---|---|---|
| AC1 | All entered values are stored in SharePoint: exactly one new item, and every field matches what was typed. | [US-01-save-new-client.spec.ts](../tests/stories/US-01-save-new-client.spec.ts) |
| AC2 | After saving, a confirmation shows "Thank you!" and the ID of the new SharePoint item. | same file |

## US-02: Required fields

> As a team member, I want the form to stop me from submitting without Company Name, Contact Name and Contact Email, so that every saved client can be identified and contacted.

| AC | Acceptance criterion | Test |
|---|---|---|
| AC1 | Submit is disabled on the empty form. | [US-02-required-fields.spec.ts](../tests/stories/US-02-required-fields.spec.ts) |
| AC2 | If Company Name, Contact Name or Contact Email is missing, and every other field is filled in, Submit is disabled. Clicking it anyway saves nothing: the form stays open and no item is added to SharePoint. This is one test per required field. | same file |
| AC3 | A required field containing only spaces counts as empty. | same file |
| AC4 | Clearing a required field after filling it in disables Submit again. | same file |
| AC5 | Filling in only the required fields is enough to save. | same file |

## US-03: Enter several clients in a row

> As a team member, I want to start the next client right after saving one, so that I can enter several clients quickly.

| AC | Acceptance criterion | Test |
|---|---|---|
| AC1 | "Submit another" opens an empty form, with Submit disabled again. | [US-03-submit-another.spec.ts](../tests/stories/US-03-submit-another.spec.ts) |

## US-04: Valid e-mail address

> As a team member, I want the form to decline a Contact Email that is not in the format local-part@domain, so that we only store e-mail addresses we can actually write to.

The check is `IsMatch(email, "[^@\s]+@[^@\s.]+(\.[^@\s.]+)+")`: a local part, exactly one `@`, then a domain of dot-separated parts, with no spaces anywhere. The built-in `Match.Email` isn't used, because the tests showed that it accepts `anna@@example.com` and `anna maria@example.com`.

| AC | Acceptance criterion | Test |
|---|---|---|
| AC1 | Valid addresses are accepted, with no error shown and Submit enabled. The test uses `anna@example.com`, `first.last@mail.example.de` and `anna+clients@example.com`. | [US-04-email-format.spec.ts](../tests/stories/US-04-email-format.spec.ts) |
| AC2 | An invalid address is declined: the message "Enter a valid e-mail (name@domain.com)" is shown, Submit is disabled, and clicking it anyway saves nothing. This is one test per example: no `@`, no local part, no domain, a domain without a dot, two `@`, and a space. | same file |

---

## Adding a story

0. Get the current app: run `./scripts/export-solution.ps1` and read the controls, formulas and texts in `src/canvas/`. For what's visible at runtime, you can also inspect the live app.
1. Add the story and its acceptance criteria to this file with the next id (`US-04`, ...).
2. Create `tests/stories/US-04-<short-name>.spec.ts`, using an existing story file as the template:
   - wrap the tests in `userStory({ id, title, asA, iWant, soThat }, () => { ... })`
   - add one `test('ACn: ...')` per acceptance criterion
   - write the body as `step('Given / When / Then ...', async () => { ... })` blocks, using the `step` fixture. This also shows the caption in the video.
3. Use the `form` fixture, which opens the app, and the `sharePoint` fixture, which checks the saved data. Give every company created by a test the `E2E-` prefix, so the cleanup deletes it after the run. `newClient()` already does this.
