# User stories: New Clients Form

Source: the published canvas app `ncf_newclients_834b2` (solution `NewClientsForm`), exported to `src/canvas/`.
Data source: SharePoint list **New Clients** on `https://<tenant>.sharepoint.com/sites/<site>`.

## The app at a glance

| Screen | What the user sees | Moves to |
|---|---|---|
| `FormScreen` | Title "New client", hint "Fields marked * are required.", 10 text inputs, button **Submit** | `SuccessScreen` after a successful save |
| `SuccessScreen` | "Thank you! The client was saved (ID *n*)." and button **Submit another** | `FormScreen` |

| Control | Label | List column | Required |
|---|---|---|---|
| `txtCompanyName` | Company Name * | Title | yes (app) |
| `txtRegistrationNumber` | Registration Number | Registration Number | |
| `txtIndustry` | Industry | Industry | |
| `txtWebsite` | Website | Website | |
| `txtCountry` | Country | Country | |
| `txtContactName` | Contact Name * | Contact Name | yes (app + list) |
| `txtContactEmail` | Contact Email * | Contact Email | yes (app + list), must be an e-mail |
| `txtContactPhone` | Contact Phone | Contact Phone | |
| `txtAddress` | Address | Address | |
| `txtNotes` (multi-line) | Notes | Notes | |

Rules from the export:

- **Submit** is disabled unless `Trim(Company Name)` and `Trim(Contact Name)` are not blank and `Trim(Contact Email)`
  matches `[^@\s]+@[^@\s.]+(\.[^@\s.]+)+` (whole value).
- `lblContactEmailError` ("Enter a valid e-mail (name@domain.com)") is visible when the trimmed e-mail is not blank
  and does not match that pattern.
- **Submit** saves every field with `Trim(...)` via `Patch('New Clients', ...)`, resets all inputs and opens
  `SuccessScreen`. If the save fails, it shows the error "Could not save the client: <message>" and stays on the form.
- All list text columns except Notes allow at most 255 characters. The inputs have no length limit.

---

## US-01: Register a new client

*As a* sales employee, *I want* to enter a new client's company and contact details in one form,
*so that* the client is recorded in the New Clients list.

- **AC1** With all ten fields filled in, Submit saves one item whose columns match what was typed.
- **AC2** After saving, the success screen shows "Thank you! The client was saved (ID *n*)." where *n* is the ID
  of the saved item.
- **AC3** With only the three required fields filled in, the item is saved and the optional columns are empty.
- **AC4** Leading and trailing spaces are removed before saving (for example "  Contoso  " is saved as "Contoso").
- **AC5** If a value is longer than the list allows (256 characters in Company Name), the user sees
  "Could not save the client: ...", stays on the form, and nothing is saved.

| AC | Test file |
|---|---|
| AC1–AC5 | `tests/stories/US-01-register-client.spec.ts` |

## US-02: Required fields

*As a* sales employee, *I want* the form to stop me from submitting without company name, contact name and
contact e-mail, *so that* every client in the list can be identified and contacted.

- **AC1** On an empty form, Submit is disabled.
- **AC2** For each required field: with all other fields filled in and this one empty, Submit is disabled and a
  forced click saves nothing.
- **AC3** For each required field: with only spaces in it, Submit is disabled and a forced click saves nothing.
- **AC4** For each required field: filling the form, then clearing this field, disables Submit again.
- **AC5** Labels of required fields end with "*", and the hint "Fields marked * are required." is shown.

| AC | Test file |
|---|---|
| AC1–AC5 | `tests/stories/US-02-required-fields.spec.ts` |

## US-03: Contact e-mail validation

*As a* sales employee, *I want* to be told when the contact e-mail is not a valid address,
*so that* we don't save clients we cannot reach.

- **AC1** Valid addresses are accepted: no error, Submit enabled, saved as typed. Examples: `name@domain.com`,
  `first.last@sub.domain.co.uk`, `name+tag@domain.io`, `  name@domain.com  ` (spaces around are trimmed).
- **AC2** Invalid addresses show "Enter a valid e-mail (name@domain.com)", Submit is disabled, and a forced click
  saves nothing. Examples: `name`, `name@`, `@domain.com`, `name@domain`, `name@@domain.com`, `na me@domain.com`,
  `name@domain.`, `name@.com`.
- **AC3** The error is not shown while the e-mail field is empty.
- **AC4** Fixing an invalid address hides the error and enables Submit.
- **AC5** Addresses that are not valid but slip through the app's pattern are rejected too. Examples:
  `name..x@domain.com` (two dots in a row), `.name@domain.com` (leading dot), `name@domain..com`, `name@-domain.com`
  (domain starting with a hyphen), `name@do_main.com` (underscore in domain).
  *I expect the current app to accept most of these. If it does, the tests stay, are marked `test.fail()`, and
  I report them as app bugs.*

| AC | Test file |
|---|---|
| AC1–AC5 | `tests/stories/US-03-email-validation.spec.ts` |

## US-04: Submit another client

*As a* sales employee, *I want* to start a new, empty form right after saving,
*so that* I can enter several clients in a row.

- **AC1** "Submit another" opens the form with all ten fields empty and Submit disabled.
- **AC2** A second client entered after "Submit another" is saved as a new, separate item (different ID),
  and the first item is unchanged.

| AC | Test file |
|---|---|
| AC1–AC2 | `tests/stories/US-04-submit-another.spec.ts` |

---

## Adding a story

1. Publish the app, run `./scripts/export-solution.ps1 -SolutionName NewClientsForm`, and read `git diff src/canvas`.
2. Add `US-0n: <title>` here with *As a / I want / so that*, numbered, checkable ACs and the AC → test file table.
3. New controls go into the page object `tests/pages/NewClientsPage.ts`. Use the control name as the contract,
   `[data-control-name="<name>"]`, and never guess one that isn't in the export.
4. One spec per story, `tests/stories/US-0n-<short-name>.spec.ts`, wrapped in `userStory({ id, title, asA, iWant, soThat })`.
   One `test('ACn: ...')` per AC, with a loop when an AC has one case per field or example.
5. Test bodies are only `step('Given / When / Then ...')` blocks.
6. Check saved values in SharePoint, not only on screen. "Nothing is saved" = force the click, then check the list
   has no item with this test's unique value.
7. Test data comes from `tests/utils/testData.ts`. Every record the tests create starts with `E2E-` in Company Name
   (Title), so cleanup can delete it.
8. If the app is wrong, keep the test, mark it `test.fail()` with a comment naming the bug, and report it.
