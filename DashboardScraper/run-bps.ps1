param(
    [string]$Year = "",

    [ValidateSet("export", "import")]
    [string]$Flow = "export",

    [string]$StartFromHs = "",

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runnerPath = Join-Path $scriptDir "project_data\scrapapibps.py"
$currentYear = (Get-Date).Year
$minYear = $currentYear - 10
$maxYear = $currentYear - 1

if ([string]::IsNullOrWhiteSpace($Year)) {
    $Year = [string]$maxYear
}

if ($Year -notmatch '^\d{4}$') {
    throw "Parameter Year harus 4 digit angka."
}

$yearInt = [int]$Year
if ($yearInt -lt $minYear -or $yearInt -gt $maxYear) {
    throw "Parameter Year harus berada di rentang $minYear sampai $maxYear."
}

if (-not (Test-Path $runnerPath)) {
    throw "File runner BPS tidak ditemukan: $runnerPath"
}

$arguments = @(
    $runnerPath,
    "--year", $Year,
    "--flow", $Flow
)

if ($StartFromHs -ne "") {
    $arguments += @("--start-from-hs", $StartFromHs)
}

if ($DryRun) {
    $arguments += "--dry-run"
}

Set-Location -LiteralPath $scriptDir
Write-Host ("Running BPS scraper | year=" + $Year + " | flow=" + $Flow)
& py @arguments
