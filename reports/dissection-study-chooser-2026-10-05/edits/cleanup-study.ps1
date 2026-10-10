$ErrorActionPreference = 'Stop'
$taskWorkspace = 'C:\Users\cabba\Documents\Codex\2026-09-29\please-keep-improving-interactivity-engagement-and'
$taskScratch = Join-Path $taskWorkspace 'dissection-study-chooser-2026-10-05'
$taskTemporary = 'C:\Users\cabba\Documents\Codex\.diss-study-20261005'
$taskReport = 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\reports\dissection-study-chooser-2026-10-05'
$taskTargets = @($taskScratch, $taskTemporary)
$taskResolvedTargets = @()
foreach ($taskTarget in $taskTargets) {
  if (-not (Test-Path -LiteralPath $taskTarget)) { continue }
  $taskResolved = (Resolve-Path -LiteralPath $taskTarget).Path
  if (-not [string]::Equals($taskResolved, [IO.Path]::GetFullPath($taskTarget), [StringComparison]::OrdinalIgnoreCase)) { throw 'Resolved cleanup target differs from named task directory' }
  $taskParent = [IO.Path]::GetDirectoryName($taskResolved)
  $taskExpectedParent = if ($taskTarget -eq $taskScratch) { $taskWorkspace } else { 'C:\Users\cabba\Documents\Codex' }
  if (-not [string]::Equals($taskParent, $taskExpectedParent, [StringComparison]::OrdinalIgnoreCase)) { throw 'Cleanup target is outside its intended parent' }
  $taskItems = @((Get-Item -LiteralPath $taskResolved -Force)) + @(Get-ChildItem -LiteralPath $taskResolved -Force -Recurse)
  foreach ($taskItem in $taskItems) {
    if (($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw ('Cleanup target contains a reparse point: ' + $taskItem.FullName) }
  }
  $taskResolvedTargets += $taskResolved
}
foreach ($taskResolved in $taskResolvedTargets) { Remove-Item -LiteralPath $taskResolved -Recurse -Force }
@{ removed = $taskResolvedTargets; completedAt = [DateTime]::UtcNow.ToString('o'); validatedAbsoluteTargets = $true; rejectedReparsePoints = $true } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $taskReport 'cleanup-receipt.json') -Encoding utf8
Write-Output ('Removed ' + $taskResolvedTargets.Count + ' owned task directories')
