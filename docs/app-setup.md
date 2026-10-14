# App setup: Power App + SharePoint

The app lives in Power Platform, in the solution **NewClientsForm**. This repo holds an **export** of it, never hand-written app code:

| Folder | What it is |
|---|---|
| `src/canvas/<app>/*.pa.yaml` | readable source of the published app: screens, controls, formulas |
| `src/solution/` | the unpacked solution, which can be imported into another environment |

## 1. Get the current app into the repo (export)

After every change in Power Apps Studio, and before writing tests against the app:

```powershell
winget install Microsoft.PowerAppsCLI                               # once
pac auth create --environment 143dbdf0-8582-e53c-b232-5ff8e209115d  # once, opens a sign-in window
./scripts/export-solution.ps1
git diff src/canvas                                                 # what changed in the app
```

`pac` may not be on the PATH in an already open terminal. The script also finds it in `%LOCALAPPDATA%\Microsoft\PowerAppsCLI`.

## 2. SharePoint list

The app writes to the list **New Clients** on the PandaTest team site, `https://archtexx10.sharepoint.com/sites/PandaTest`. To create the list somewhere else, go to **+ New → List → Blank list**, name it **New Clients**, rename **Title** to **Company Name**, and add these columns:

| Column (exact name) | Type | Required |
|---|---|---|
| Registration Number | Single line of text | |
| Industry | Single line of text | |
| Website | Single line of text | |
| Country | Single line of text | |
| Contact Name | Single line of text | ✅ |
| Contact Email | Single line of text | ✅ |
| Contact Phone | Single line of text | |
| Address | Single line of text | |
| Notes | Multiple lines of text | |

The app's formulas use these names. The company name goes into the internal `Title` column, so that column's display name doesn't matter.

## 3. Rebuild the app in another environment (import)

The target environment needs Dataverse, which solutions require.

```powershell
pac solution pack --zipfile out/NewClientsForm.zip --folder src/solution --packagetype Unmanaged
pac auth create --environment <target-environment>
pac solution import --path out/NewClientsForm.zip
```

Then, in make.powerapps.com, open the app. If the SharePoint connection or site differs, re-point the **New Clients** data source to it. Finally, **publish** the app.

## Notes

- **Control names are the contract for the Playwright tests.** The tests find `txtCompanyName`, `btnSubmit`, `lblSuccess` and the rest by name, so renaming a control breaks them.
- **Publish, then export.** The tests run against the *published* app, and the export shows what that app contains.
- **Data access prompt:** on first use, each user is asked to "Allow New Clients to access your data?", and the answer is remembered. An admin can turn it off for this app with `Set-AdminPowerAppApisToBypassConsent -EnvironmentName <env-id> -AppName <app-id>` (module `Microsoft.PowerApps.Administration.PowerShell`).
- **Saving fails for some users:** they need Edit permission on the SharePoint site. Team members have it.
