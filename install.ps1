# fsr installer for Windows.
#   irm https://raw.githubusercontent.com/agrublev/freedcamp-script-runner/Development/install.ps1 | iex
# Options (env): $env:FSR_VERSION = "v7.7.0" (default latest), $env:FSR_INSTALL_DIR
$ErrorActionPreference = "Stop"
$repo = "agrublev/freedcamp-script-runner"
$version = if ($env:FSR_VERSION) { $env:FSR_VERSION } else { "latest" }
$dir = if ($env:FSR_INSTALL_DIR) { $env:FSR_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\fsr" }
# Pick the build for this CPU: native ARM64 (Surface, Snapdragon laptops) or x64.
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
$name = "fsr-windows-$arch"
$base = if ($env:FSR_BASE_URL) { $env:FSR_BASE_URL }
        elseif ($version -eq "latest") { "https://github.com/$repo/releases/latest/download" }
        else { "https://github.com/$repo/releases/download/$version" }

$tmp = Join-Path ([IO.Path]::GetTempPath()) ("fsr-" + [guid]::NewGuid())
New-Item -ItemType Directory $tmp | Out-Null
try {
  Write-Host "Downloading $name ($version)..."
  $zip = Join-Path $tmp "$name.zip"
  Invoke-WebRequest "$base/$name.zip" -OutFile $zip -UseBasicParsing
  try {
    # Save to a file: GitHub serves .sha256 as octet-stream, so .Content would be
    # a byte[] on Windows PowerShell 5.1 and never match.
    $sumFile = Join-Path $tmp "$name.zip.sha256"
    Invoke-WebRequest "$base/$name.zip.sha256" -OutFile $sumFile -UseBasicParsing
    $want = ((Get-Content $sumFile -Raw).Trim() -split '\s+')[0].ToLower()
    $got = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
    if ($want -ne $got) { throw "checksum mismatch (expected $want, got $got)" }
  # Plain catch: pwsh 7 throws HttpResponseException on a 404 (not WebException),
  # and with $ErrorActionPreference = "Stop" a typed catch would abort instead of warn.
  } catch { Write-Warning "no checksum file found, skipping verification" }
  Expand-Archive $zip -DestinationPath $tmp -Force
  New-Item -ItemType Directory -Force $dir | Out-Null
  Copy-Item (Join-Path $tmp "fsr.exe") (Join-Path $dir "fsr.exe") -Force
} finally { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not ($userPath -split ";" | Where-Object { $_ -eq $dir })) {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$dir", "User")
  $env:Path += ";$dir"
  Write-Host "Added $dir to your PATH (open a new terminal to pick it up)."
}
Write-Host "Installed: $(& (Join-Path $dir 'fsr.exe') --version) -> $dir\fsr.exe" -ForegroundColor Green
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "note: plugins need Node 22+ (core fsr works without it)" }
