<#
.SYNOPSIS
  Exports the published solution and unpacks its canvas apps into src/.

.EXAMPLE
  ./scripts/export-solution.ps1 -SolutionName NewClientsForm
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$SolutionName
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Find pac on PATH or in the default install folder
$pac = (Get-Command pac -ErrorAction SilentlyContinue).Source
if (-not $pac) {
    $pac = Join-Path $env:LOCALAPPDATA 'Microsoft\PowerAppsCLI\pac.cmd'
    if (-not (Test-Path $pac)) {
        throw 'Power Platform CLI not found. Install it with: winget install Microsoft.PowerAppsCLI'
    }
}

$outDir = Join-Path $root 'out'
$zip = Join-Path $outDir "$SolutionName.zip"
$solutionDir = Join-Path $root 'src/solution'
$canvasDir = Join-Path $root 'src/canvas'
New-Item -ItemType Directory -Force $outDir | Out-Null

Write-Host "Exporting solution '$SolutionName'..."
& $pac solution export --name $SolutionName --path $zip --overwrite
if ($LASTEXITCODE -ne 0) { throw "pac solution export failed ($LASTEXITCODE)" }

# The zip can be locked right after the download, so retry the unpack.
# pac can report the lock and still exit with 0, so also check for its output.
$solutionXml = Join-Path $solutionDir 'Other/Solution.xml'
$unpacked = $false
for ($i = 1; $i -le 3 -and -not $unpacked; $i++) {
    Start-Sleep -Seconds 3
    Write-Host "Unpacking (attempt $i)..."
    if (Test-Path $solutionXml) { Remove-Item $solutionXml -Force }
    $log = & $pac solution unpack --zipfile $zip --folder $solutionDir --packagetype Unmanaged --allowDelete --allowWrite 2>&1
    $log | Write-Host
    $unpacked = ($LASTEXITCODE -eq 0) -and (Test-Path $solutionXml) -and -not ($log -match '^Error:')
}
if (-not $unpacked) { throw 'pac solution unpack failed 3 times' }

# Expand each .msapp and copy its YAML sources to src/canvas/<app>/
New-Item -ItemType Directory -Force $canvasDir | Out-Null
Get-ChildItem (Join-Path $solutionDir 'CanvasApps') -Filter *.msapp | ForEach-Object {
    $name = $_.BaseName
    $appName = $name -replace '_DocumentUri$', ''
    $appZip = Join-Path $outDir "$name.zip"
    $appOut = Join-Path $outDir $name
    $appSrc = Join-Path $canvasDir $appName

    Copy-Item $_.FullName $appZip -Force
    if (Test-Path $appOut) { Remove-Item -Recurse -Force $appOut }
    Expand-Archive -Path $appZip -DestinationPath $appOut -Force

    if (Test-Path $appSrc) { Remove-Item -Recurse -Force $appSrc }
    New-Item -ItemType Directory -Force $appSrc | Out-Null
    # _EditorState.pa.yaml holds Studio view state only
    Copy-Item (Join-Path $appOut 'Src/*') $appSrc -Recurse -Force -Exclude '_EditorState.pa.yaml'
    Write-Host "Canvas app '$appName' -> src/canvas/$appName"
}

Write-Host 'Done.'
