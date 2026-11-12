<#
.SYNOPSIS
  1-Click FoodAI Android APK build, version bump, and device install script.

.EXAMPLE
  .\scripts\build_apk.ps1
  .\scripts\build_apk.ps1 -Bump patch -Install
#>
param(
  [ValidateSet('none', 'patch', 'minor', 'major')]
  [string]$Bump = 'none',
  [switch]$Install
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $RootDir 'frontend'
$AndroidDir = Join-Path $FrontendDir 'android'
$VersionFiles = @(
  (Join-Path $FrontendDir 'src\config\version.ts'),
  (Join-Path $RootDir 'src\config\version.ts')
)
$BuildGradle = Join-Path $AndroidDir 'app\build.gradle'

# 1. Optional version bump across version.ts and build.gradle
if ($Bump -ne 'none') {
  $primaryVersionFile = $VersionFiles[0]
  $content = Get-Content $primaryVersionFile -Raw

  if ($content -match "APP_VERSION\s*=\s*'(\d+)\.(\d+)\.(\d+)'") {
    $maj = [int]$Matches[1]
    $min = [int]$Matches[2]
    $pat = [int]$Matches[3]
    switch ($Bump) {
      'major' { $maj++; $min = 0; $pat = 0 }
      'minor' { $min++; $pat = 0 }
      'patch' { $pat++ }
    }
    $newVersion = "$maj.$min.$pat"
  } else {
    throw "Could not parse APP_VERSION in $primaryVersionFile"
  }

  if ($content -match "APP_BUILD_NUMBER\s*=\s*(\d+)") {
    $newBuild = ([int]$Matches[1]) + 1
  } else {
    throw "Could not parse APP_BUILD_NUMBER in $primaryVersionFile"
  }

  Write-Host "Bumping version to v$newVersion (build $newBuild)..." -ForegroundColor Cyan

  foreach ($vf in $VersionFiles) {
    if (Test-Path $vf) {
      $c = Get-Content $vf -Raw
      $c = $c -replace "APP_VERSION\s*=\s*'[^']+'", "APP_VERSION = '$newVersion'"
      $c = $c -replace "APP_BUILD_NUMBER\s*=\s*\d+", "APP_BUILD_NUMBER = $newBuild"
      Set-Content -Path $vf -Value $c -NoNewline
    }
  }

  $gradleContent = Get-Content $BuildGradle -Raw
  $gradleContent = $gradleContent -replace "versionCode\s+\d+", "versionCode $newBuild"
  $gradleContent = $gradleContent -replace 'versionName\s+"[^"]+"', "versionName `"$newVersion`""
  Set-Content -Path $BuildGradle -Value $gradleContent -NoNewline
}

# 2. Build Frontend & Sync Capacitor
Write-Host "`n[1/3] Building frontend production bundle..." -ForegroundColor Green
Push-Location $FrontendDir
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

  Write-Host "`n[2/3] Syncing web assets to Capacitor Android..." -ForegroundColor Green
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }
} finally {
  Pop-Location
}

# 3. Compile Android APK via Gradle
Write-Host "`n[3/3] Compiling Android APK via Gradle..." -ForegroundColor Green
Push-Location $AndroidDir
try {
  .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) { throw "Gradle assembleDebug failed" }
} finally {
  Pop-Location
}

$GeneratedApk = Join-Path $AndroidDir 'app\build\outputs\apk\debug\app-debug.apk'
$RootApk = Join-Path $RootDir 'FoodAI.apk'
Copy-Item -Path $GeneratedApk -Destination $RootApk -Force

$apkInfo = Get-Item $RootApk
Write-Host "`n[SUCCESS] APK ready: $($apkInfo.FullName) ($([Math]::Round($apkInfo.Length / 1MB, 2)) MB)" -ForegroundColor Cyan

# 4. Optional ADB Install & Launch
if ($Install) {
  $AdbPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
  if (-not (Test-Path $AdbPath)) {
    $AdbPath = 'adb'
  }
  $devices = & $AdbPath devices | Select-String '\bdevice$'
  if ($devices) {
    Write-Host "`nInstalling onto connected Android device..." -ForegroundColor Green
    & $AdbPath install -r $RootApk
    & $AdbPath shell am start -S -n com.foodai.app/.MainActivity
  } else {
    Write-Warning "No Android device detected via ADB. Connect USB with USB Debugging enabled to auto-install."
  }
}
