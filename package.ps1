# Builds a deployable zip of the Helpdesk Asset Manager into .\dist
# Usage: powershell -ExecutionPolicy Bypass -File package.ps1 [-IncludeAnswerKey]
param(
    [switch]$IncludeAnswerKey
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$name = "helpdesk-asset-manager-$version"
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist $name
$zip = Join-Path $dist "$name.zip"

$files = @(
    'server.js',
    'package.json',
    'package-lock.json',
    'start.bat',
    'README.md',
    'data\assets.json',
    'data\users.json',
    'exports\README.txt'
)
if ($IncludeAnswerKey) { $files += 'VULNERABILITIES.md' }

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
if (Test-Path $zip) { Remove-Item $zip -Force }

foreach ($f in $files) {
    $src = Join-Path $root $f
    if (-not (Test-Path $src)) { throw "Missing file: $f" }
    $dest = Join-Path $stage $f
    New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
    Copy-Item $src $dest
}

Compress-Archive -Path $stage -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host "Created $zip"
if (-not $IncludeAnswerKey) { Write-Host 'Answer key (VULNERABILITIES.md) excluded. Use -IncludeAnswerKey to add it.' }
