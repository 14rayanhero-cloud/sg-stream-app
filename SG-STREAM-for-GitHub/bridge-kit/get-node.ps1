# Downloads a private portable Node.js next to this script and verifies its SHA-256 against nodejs.org.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ver = 'v22.11.0'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$zipName = "node-$ver-win-x64.zip"
$base = "https://nodejs.org/dist/$ver"
$zip = Join-Path $env:TEMP $zipName
try {
  Invoke-WebRequest "$base/$zipName" -OutFile $zip -UseBasicParsing
  $sums = (Invoke-WebRequest "$base/SHASUMS256.txt" -UseBasicParsing).Content -split "`n"
  $want = (($sums | Where-Object { $_ -match [regex]::Escape($zipName) + '\s*$' }) -split '\s+')[0]
  $got = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
  if (-not $want -or $want.ToLower() -ne $got) { throw 'Checksum mismatch - download discarded.' }
  $tmp = Join-Path $env:TEMP ('sgnode-' + [guid]::NewGuid())
  Expand-Archive $zip -DestinationPath $tmp
  Move-Item (Join-Path $tmp "node-$ver-win-x64") (Join-Path $dir 'node')
  Remove-Item $tmp -Recurse -Force
  Write-Host 'Node.js is ready.'
} catch { Write-Host "Download failed: $_" -ForegroundColor Red }
finally { if (Test-Path $zip) { Remove-Item $zip -Force } }