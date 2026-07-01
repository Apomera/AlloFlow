<#
Windows wrapper for deploy.sh.

Use this from PowerShell when Windows routes plain `bash` to a broken or
unconfigured WSL launcher. It calls Git Bash directly, matching the deploy path
that works for AlloFlow on this machine.

Example:
  .\deploy.ps1 "Deploy source updates"
#>
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $DeployArgs
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gitBash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe'

if (-not (Test-Path -LiteralPath $gitBash)) {
  throw "Git Bash was not found at $gitBash. Install Git for Windows or run deploy.sh from a working Bash shell."
}

Push-Location $repoRoot
try { & $gitBash 'deploy.sh' @DeployArgs } finally { Pop-Location }
exit $LASTEXITCODE
