param([string]$ReportDirectory)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class CacheStoredSize {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern uint GetCompressedFileSizeW(string name, out uint high);
}
'@
$candidateRoots = @(
  'C:\Users\cabba\.codex\cache',
  'C:\Users\cabba\.claude\cache',
  'C:\Users\cabba\.claude\telemetry',
  'C:\Users\cabba\.cache\firebase',
  'C:\Users\cabba\AppData\Local\npm-cache\_cacache',
  'C:\Users\cabba\AppData\Local\npm-cache\_logs',
  'C:\Users\cabba\AppData\Local\ms-playwright'
)
$started = [DateTime]::UtcNow
$processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
$results = @()
foreach ($candidateRoot in $candidateRoots) {
  if (-not (Test-Path -LiteralPath $candidateRoot -PathType Container)) { continue }
  $files = [System.Collections.Generic.List[object]]::new()
  $errors = [System.Collections.Generic.List[string]]::new()
  $reparsePoints = [System.Collections.Generic.List[string]]::new()
  $pending = [System.Collections.Generic.Stack[string]]::new()
  $pending.Push($candidateRoot)
  while ($pending.Count -gt 0) {
    $directory = $pending.Pop()
    try { $children = @(Get-ChildItem -LiteralPath $directory -Force -ErrorAction Stop) }
    catch { $errors.Add($directory); continue }
    foreach ($entry in $children) {
      if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { $reparsePoints.Add($entry.FullName); continue }
      if ($entry.PSIsContainer) { $pending.Push($entry.FullName); continue }
      [uint32]$high = 0
      [uint32]$low = [CacheStoredSize]::GetCompressedFileSizeW($entry.FullName, [ref]$high)
      $nativeError = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
      $stored = $null
      if ($low -eq [uint32]::MaxValue -and $nativeError -ne 0) { $errors.Add($entry.FullName) }
      else { $stored = [uint64]$high * [uint64]4294967296 + [uint64]$low }
      $files.Add([pscustomobject]@{Path=$entry.FullName; LogicalBytes=[int64]$entry.Length; NativeStoredBytes=$stored; LastWriteTimeUtc=$entry.LastWriteTimeUtc.ToString('o'); Attributes=$entry.Attributes.ToString()})
    }
  }
  $references = @($processes | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($candidateRoot,[StringComparison]::OrdinalIgnoreCase) -ge 0 } | ForEach-Object { [pscustomobject]@{PID=$_.ProcessId;Name=$_.Name} })
  $groups = @($files | Group-Object { $relative=$_.Path.Substring($candidateRoot.Length).TrimStart('\'); ($relative -split '\\')[0] } | ForEach-Object { [pscustomobject]@{Name=$_.Name;Files=$_.Count;LogicalBytes=($_.Group | Measure-Object LogicalBytes -Sum).Sum;NativeStoredBytes=($_.Group | Measure-Object NativeStoredBytes -Sum).Sum;NewestUtc=($_.Group | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1).LastWriteTimeUtc} })
  $results += [pscustomobject]@{Root=$candidateRoot;FileCount=$files.Count;LogicalBytes=($files | Measure-Object LogicalBytes -Sum).Sum;NativeStoredBytes=($files | Measure-Object NativeStoredBytes -Sum).Sum;OldestUtc=($files | Sort-Object LastWriteTimeUtc | Select-Object -First 1).LastWriteTimeUtc;NewestUtc=($files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1).LastWriteTimeUtc;ProcessReferences=$references;DirectCommandLineReferenceIsNotHandleProof=$true;Errors=@($errors);SkippedReparsePoints=@($reparsePoints);Groups=$groups;Files=@($files)}
}
$output=[pscustomobject]@{StartedUtc=$started.ToString('o');CompletedUtc=[DateTime]::UtcNow.ToString('o');Method='Metadata only; Win32 GetCompressedFileSizeW. Excludes directory overhead; ordinary uncompressed file values do not measure allocation slack. Command-line references cannot prove inactivity.';Results=$results;DeletedFiles=0}
$output | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $ReportDirectory 'user-caches.json') -Encoding UTF8
$results | Select-Object Root,FileCount,LogicalBytes,NativeStoredBytes,OldestUtc,NewestUtc,@{n='ReferencedPids';e={@($_.ProcessReferences.PID)}},@{n='ErrorCount';e={$_.Errors.Count}},@{n='ReparseCount';e={$_.SkippedReparsePoints.Count}},Groups | ConvertTo-Json -Depth 5
