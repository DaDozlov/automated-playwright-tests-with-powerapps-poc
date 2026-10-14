# App setup

## The app

| | |
|---|---|
| App | New Clients Form (`ncf_newclients_834b2`), canvas app |
| Solution | `NewClientsForm` ("New Clients Form"), unmanaged |
| Environment | `<environment-id>` (`https://<org>.crm4.dynamics.com/`) |
| App ID | `<app-id>` |
| Tenant ID | `<tenant-id>` |
| Data source | SharePoint list **New Clients** on `https://<tenant>.sharepoint.com/sites/<site>` |

## Exporting the published app

Requires the Power Platform CLI (`winget install Microsoft.PowerAppsCLI`) and a `pac` auth profile for the
environment:

```powershell
pac auth create --environment <environment-id>                # once; sign in in the window that opens
pac org who                                                         # check the environment
./scripts/export-solution.ps1 -SolutionName NewClientsForm
git diff src/canvas
```

The script exports the solution to `out/NewClientsForm.zip`, unpacks it to `src/solution/`, expands the `.msapp`
into `out/` and copies its YAML sources (without `_EditorState.pa.yaml`) to `src/canvas/ncf_newclients_834b2/`.
Only *published* changes are exported, so publish in Studio first.

Never edit `src/` by hand; change the app in Studio, publish, and export again.

## Data source schema: SharePoint list "New Clients"

| Column (display name) | Internal name | Type | Required in list | Written by the app from |
|---|---|---|---|---|
| Title (shown as "Titel") | `Title` | Single line of text, max 255 | no | `Trim(txtCompanyName.Text)` |
| Registration Number | `RegistrationNumber` | Single line of text, max 255 | no | `Trim(txtRegistrationNumber.Text)` |
| Industry | `Industry` | Single line of text, max 255 | no | `Trim(txtIndustry.Text)` |
| Website | `Website` | Single line of text, max 255 | no | `Trim(txtWebsite.Text)` |
| Country | `Country` | Single line of text, max 255 | no | `Trim(txtCountry.Text)` |
| Contact Name | `ContactName` | Single line of text, max 255 | yes | `Trim(txtContactName.Text)` |
| Contact Email | `ContactEmail` | Single line of text, max 255 | yes | `Trim(txtContactEmail.Text)` |
| Contact Phone | `ContactPhone` | Single line of text, max 255 | no | `Trim(txtContactPhone.Text)` |
| Address | `Address` | Single line of text, max 255 | no | `Trim(txtAddress.Text)` |
| Notes | `Notes` | Multiple lines of text (plain) | no | `Trim(txtNotes.Text)` |

Company Name is required by the app (Submit stays disabled), not by the list.

## Importing the solution into another environment

```powershell
pac solution pack --zipfile out/NewClientsForm.zip --folder src/solution --packagetype Unmanaged
pac auth create --environment <target-environment-id>
pac solution import --path out/NewClientsForm.zip
```

The app's SharePoint connection is not part of the solution. After the import, open the app in Studio in the target
environment, sign in to the SharePoint connector, point the **New Clients** data source to a list with the columns
above, and publish. Then update `APP_URL`, `SP_SITE_URL` and `SP_LIST_TITLE` in `.env`.
