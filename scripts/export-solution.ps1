<#
.SYNOPSIS
    Exports the NewClientsForm solution from Power Platform and unpacks it into the repo.

.DESCRIPTION
    - src/solution/           unpacked solution (what you import into another environment)
    - src/canvas/<AppName>/   the canvas app's *.pa.yaml source, for reviewing changes in PRs

    Needs the Power Platform CLI (winget install Microsoft.PowerAppsCLI).
    Sign in once beforehand with: pac auth create --environment <environment-id or URL>

.EXAMPLE
    ./scripts/export-solution.ps1
#>
param(
    [string] $SolutionName = "NewClientsForm"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "out"
$zip = Join-Path $outDir "$SolutionName.zip"
$solutionDir = Join-Path $root "src/solution"
$canvasDir = Join-Path $root "src/canvas"

New-Item -ItemType Directory -Force $outDir | Out-Null

# pac from PATH, or the default location of the winget/MSI install.
$pac = (Get-Command pac -ErrorAction SilentlyContinue).Source
if (-not $pac) { $pac = Join-Path $env:LOCALAPPDATA "Microsoft\PowerAppsCLI\pac.cmd" }
if (-not (Test-Path $pac)) { throw "Power Platform CLI not found. Install it: winget install Microsoft.PowerAppsCLI" }

& $pac solution export --name $SolutionName --path $zip --overwrite
if ($LASTEXITCODE -ne 0) { throw "pac solution export failed" }

# Right after the download the zip can still be locked (e.g. by the virus scanner), so retry.
foreach ($attempt in 1..3) {
    & $pac solution unpack --zipfile $zip --folder $solutionDir --packagetype Unmanaged --allowDelete --allowWrite
    if ($LASTEXITCODE -eq 0 -and (Test-Path (Join-Path $solutionDir "Other"))) { break }
    if ($attempt -eq 3) { throw "pac solution unpack failed" }
    Start-Sleep -Seconds 5
}

# Extract the readable pa.yaml source from every .msapp in the solution.
# Only the Src folder is stable between saves, so that's all we keep.
Get-ChildItem (Join-Path $solutionDir "CanvasApps") -Filter *.msapp | ForEach-Object {
    $tmp = Join-Path $outDir $_.BaseName
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
    Copy-Item $_.FullName "$tmp.zip" -Force
    Expand-Archive -Path "$tmp.zip" -DestinationPath $tmp -Force

    # e.g. ncf_newclients_834b2_DocumentUri.msapp -> src/canvas/ncf_newclients_834b2
    $target = Join-Path $canvasDir ($_.BaseName -replace '_DocumentUri$', '')
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    New-Item -ItemType Directory -Force $target | Out-Null
    # _EditorState.pa.yaml only holds Studio view state (tree order etc.), not app logic.
    Copy-Item (Join-Path $tmp "Src/*") $target -Recurse -Exclude "_EditorState.pa.yaml"
    Write-Host "Canvas source: $target"
}

Write-Host "Exported $SolutionName. Review the changes with: git status"
