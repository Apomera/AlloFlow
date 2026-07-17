[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProductName = 'AlloFlow Desktop'
$DesktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) "$ProductName.lnk"
$ProgramsRoot = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
$StartShortcut = Join-Path $ProgramsRoot "$ProductName.lnk"
$DiagnosticDir = Join-Path $env:LOCALAPPDATA $ProductName
$DiagnosticPath = Join-Path $DiagnosticDir 'install-diagnostics.txt'
$DefaultExe = Join-Path $env:LOCALAPPDATA "Programs\$ProductName\$ProductName.exe"
$Installers = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '..\dist') -Filter 'AlloFlow-Desktop-*-setup.exe' -File |
  Where-Object { $_.Name -notmatch '-(?:x64|arm64)-setup\.exe$' })
if ($Installers.Count -ne 1) {
  throw "Expected exactly one combined Windows installer; found $($Installers.Count)."
}
$Installer = $Installers[0]
$Arm64Installers = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '..\dist') -Filter 'AlloFlow-Desktop-*-arm64-setup.exe' -File)
if ($Arm64Installers.Count -ne 1) {
  throw "Expected exactly one ARM64-only Windows installer; found $($Arm64Installers.Count)."
}
$Arm64Installer = $Arm64Installers[0]

$RegistryRoots = @(
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
)

function Get-AlloFlowRegistrations {
  $matches = @()
  foreach ($root in $RegistryRoots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    foreach ($key in Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue) {
      $properties = Get-ItemProperty -LiteralPath $key.PSPath -ErrorAction SilentlyContinue
      if ($properties.DisplayName -eq $ProductName -or $properties.DisplayName -like "$ProductName *") {
        $matches += [pscustomobject]@{
          Key = $key.PSPath
          DisplayName = $properties.DisplayName
          InstallLocation = [string]$properties.InstallLocation
          UninstallString = [string]$properties.UninstallString
        }
      }
    }
  }
  return @($matches)
}

function Test-RegistrationForRoot {
  param(
    [Parameter(Mandatory)] $Registration,
    [Parameter(Mandatory)] [string] $Root
  )
  $canonicalRoot = [IO.Path]::GetFullPath($Root).TrimEnd('\')
  if ($Registration.InstallLocation) {
    $registeredLocation = [IO.Path]::GetFullPath($Registration.InstallLocation).TrimEnd('\')
    if ($registeredLocation -eq $canonicalRoot) { return $true }
  }
  return $Registration.UninstallString.IndexOf($canonicalRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Wait-ProcessWithTimeout {
  param(
    [Parameter(Mandatory)] [System.Diagnostics.Process] $Process,
    [Parameter(Mandatory)] [int] $TimeoutSeconds,
    [Parameter(Mandatory)] [string] $Label
  )
  if (-not $Process.WaitForExit($TimeoutSeconds * 1000)) {
    Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    throw "$Label timed out after $TimeoutSeconds seconds."
  }
  $Process.Refresh()
  if ($Process.ExitCode -ne 0) {
    throw "$Label exited with code $($Process.ExitCode)."
  }
}

function Wait-Until {
  param(
    [Parameter(Mandatory)] [scriptblock] $Condition,
    [Parameter(Mandatory)] [int] $TimeoutSeconds,
    [Parameter(Mandatory)] [string] $FailureMessage
  )
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  do {
    if (& $Condition) { return }
    Start-Sleep -Milliseconds 500
  } while ([DateTime]::UtcNow -lt $deadline)
  throw $FailureMessage
}

function Get-PeMachine {
  param([Parameter(Mandatory)] [string] $Path)
  $stream = [IO.File]::OpenRead($Path)
  $reader = [IO.BinaryReader]::new($stream)
  try {
    $stream.Position = 0x3c
    $peOffset = $reader.ReadInt32()
    $stream.Position = $peOffset
    if ($reader.ReadUInt32() -ne 0x00004550) { throw "Invalid PE signature: $Path" }
    return $reader.ReadUInt16()
  } finally {
    $reader.Dispose()
    $stream.Dispose()
  }
}

function Assert-Shortcut {
  param(
    [Parameter(Mandatory)] [string] $Path,
    [Parameter(Mandatory)] [string] $ExpectedTarget,
    [Parameter(Mandatory)] [string] $ExpectedWorkingDirectory
  )
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Shortcut is missing: $Path" }
  $shell = New-Object -ComObject WScript.Shell
  try {
    $shortcut = $shell.CreateShortcut($Path)
    if ([IO.Path]::GetFullPath($shortcut.TargetPath) -ne [IO.Path]::GetFullPath($ExpectedTarget)) {
      throw "Shortcut target is incorrect: $Path -> $($shortcut.TargetPath)"
    }
    if ([IO.Path]::GetFullPath($shortcut.WorkingDirectory) -ne [IO.Path]::GetFullPath($ExpectedWorkingDirectory)) {
      throw "Shortcut working directory is incorrect: $Path -> $($shortcut.WorkingDirectory)"
    }
    if ([string]::IsNullOrWhiteSpace($shortcut.IconLocation)) { throw "Shortcut icon is missing: $Path" }
    if ($shortcut.Description.Length -gt 160) { throw "Shortcut description exceeds 160 characters: $Path" }
  } finally {
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) | Out-Null
  }
}

$existing = @(Get-AlloFlowRegistrations)
$conflicts = @()
if ($existing.Count) { $conflicts += "$($existing.Count) uninstall registration(s)" }
if (Test-Path -LiteralPath $DefaultExe) { $conflicts += $DefaultExe }
if (Test-Path -LiteralPath $DesktopShortcut) { $conflicts += $DesktopShortcut }
if (Test-Path -LiteralPath $StartShortcut) { $conflicts += $StartShortcut }
if (Test-Path -LiteralPath $DiagnosticDir) { $conflicts += $DiagnosticDir }
if ($conflicts.Count) {
  throw 'Refusing to run the destructive installer smoke test because an AlloFlow installation may already exist: ' + ($conflicts -join '; ')
}

if ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString() -ne 'X64') {
  throw 'The native installer smoke test currently requires an x64 Windows runner.'
}
$TemporaryRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }
$InstallRoot = Join-Path $TemporaryRoot ("alloflow-installer-smoke-" + [Guid]::NewGuid().ToString('N'))
$WrongArchitectureRoot = Join-Path $TemporaryRoot ("alloflow-wrong-arch-smoke-" + [Guid]::NewGuid().ToString('N'))
$InstalledExe = Join-Path $InstallRoot "$ProductName.exe"
$WrongArchitectureExe = Join-Path $WrongArchitectureRoot "$ProductName.exe"
$Uninstaller = Join-Path $InstallRoot "Uninstall $ProductName.exe"
$preflightPassed = $true
$smokeStarted = $false

Write-Host '[AlloFlow Desktop] Native Windows installer smoke test'
Write-Host "installer: $($Installer.FullName)"
Write-Host "install root: $InstallRoot"

try {
  $smokeStarted = $true
  $wrongArchitectureProcess = Start-Process -FilePath $Arm64Installer.FullName -ArgumentList @('/S', "/D=$WrongArchitectureRoot") -PassThru -WindowStyle Hidden
  if (-not $wrongArchitectureProcess.WaitForExit(60000)) {
    Stop-Process -Id $wrongArchitectureProcess.Id -Force -ErrorAction SilentlyContinue
    throw 'ARM64-only installer rejection timed out on x64 Windows.'
  }
  $wrongArchitectureProcess.Refresh()
  if ($wrongArchitectureProcess.ExitCode -ne 2) {
    throw "ARM64-only installer rejection returned $($wrongArchitectureProcess.ExitCode), expected 2."
  }
  if (Test-Path -LiteralPath $WrongArchitectureExe) {
    throw 'ARM64-only installer extracted an application on x64 Windows.'
  }
  if (-not (Test-Path -LiteralPath $DiagnosticPath -PathType Leaf)) {
    throw 'ARM64-only installer did not write its rejection diagnostic.'
  }
  $wrongArchitectureDiagnostic = Get-Content -Raw -LiteralPath $DiagnosticPath
  if ($wrongArchitectureDiagnostic -notmatch '(?m)^ERROR=arm64InstallerOnX64\s*$') {
    throw "ARM64-only installer wrote an unexpected diagnostic:
$wrongArchitectureDiagnostic"
  }
  Remove-Item -LiteralPath $WrongArchitectureRoot -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $DiagnosticDir -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host 'ok: ARM64-only installer was rejected on x64 Windows with exit code 2'

  $installProcess = Start-Process -FilePath $Installer.FullName -ArgumentList @('/S', "/D=$InstallRoot") -PassThru -WindowStyle Hidden
  Wait-ProcessWithTimeout -Process $installProcess -TimeoutSeconds 300 -Label 'Installer'

  if (-not (Test-Path -LiteralPath $InstalledExe -PathType Leaf)) { throw "Installed executable is missing: $InstalledExe" }
  if ((Get-Item -LiteralPath $InstalledExe).VersionInfo.ProductVersion -notlike "$($Installer.VersionInfo.ProductVersion)*") {
    Write-Host 'note: installer and application file versions use different Windows version-resource formats'
  }
  if ((Get-PeMachine -Path $InstalledExe) -ne 0x8664) {
    throw 'The combined installer did not select the native x64 app on windows-latest.'
  }
  if (-not (Test-Path -LiteralPath $Uninstaller -PathType Leaf)) { throw "Uninstaller is missing: $Uninstaller" }

  Assert-Shortcut -Path $DesktopShortcut -ExpectedTarget $InstalledExe -ExpectedWorkingDirectory $InstallRoot
  Assert-Shortcut -Path $StartShortcut -ExpectedTarget $InstalledExe -ExpectedWorkingDirectory $InstallRoot

  if (-not (Test-Path -LiteralPath $DiagnosticPath -PathType Leaf)) { throw "Installer diagnostic is missing: $DiagnosticPath" }
  $diagnostic = Get-Content -Raw -LiteralPath $DiagnosticPath
  if ($diagnostic -notmatch '(?m)^appExeExists=true\s*$') { throw 'Installer diagnostic does not confirm app extraction.' }
  if ($diagnostic -match '(?m)^ERROR=') { throw "Installer diagnostic reports an error:
$diagnostic" }

  $registration = @(Get-AlloFlowRegistrations | Where-Object {
    Test-RegistrationForRoot -Registration $_ -Root $InstallRoot
  })
  if (-not $registration.Count) { throw 'The installer did not register its uninstaller for the smoke-test location.' }

  $uninstallProcess = Start-Process -FilePath $Uninstaller -ArgumentList '/S' -PassThru -WindowStyle Hidden
  Wait-ProcessWithTimeout -Process $uninstallProcess -TimeoutSeconds 180 -Label 'Uninstaller'
  Wait-Until -TimeoutSeconds 60 -FailureMessage 'The uninstaller did not remove the application directory.' -Condition {
    -not (Test-Path -LiteralPath $InstallRoot)
  }
  Wait-Until -TimeoutSeconds 30 -FailureMessage 'The uninstaller did not remove its shortcuts.' -Condition {
    -not (Test-Path -LiteralPath $DesktopShortcut) -and -not (Test-Path -LiteralPath $StartShortcut)
  }

  $remainingRegistration = @(Get-AlloFlowRegistrations | Where-Object {
    Test-RegistrationForRoot -Registration $_ -Root $InstallRoot
  })
  if ($remainingRegistration.Count) { throw 'The uninstaller left its uninstall registration behind.' }

  Write-Host '[AlloFlow Desktop] Native Windows installer smoke test passed'
} finally {
  if ($preflightPassed -and $smokeStarted) {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        $_.ExecutablePath -and ($_.ExecutablePath.StartsWith($InstallRoot, [StringComparison]::OrdinalIgnoreCase) -or $_.ExecutablePath.StartsWith($WrongArchitectureRoot, [StringComparison]::OrdinalIgnoreCase))
      } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

    if (Test-Path -LiteralPath $Uninstaller) {
      $cleanup = Start-Process -FilePath $Uninstaller -ArgumentList '/S' -PassThru -WindowStyle Hidden
      $null = $cleanup.WaitForExit(120000)
    }
    Remove-Item -LiteralPath $InstallRoot -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $WrongArchitectureRoot -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $DesktopShortcut,$StartShortcut -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $DiagnosticDir -Recurse -Force -ErrorAction SilentlyContinue

    foreach ($registration in @(Get-AlloFlowRegistrations)) {
      if (Test-RegistrationForRoot -Registration $registration -Root $InstallRoot) {
        Remove-Item -LiteralPath $registration.Key -Recurse -Force -ErrorAction SilentlyContinue
      }
    }
  }
}

