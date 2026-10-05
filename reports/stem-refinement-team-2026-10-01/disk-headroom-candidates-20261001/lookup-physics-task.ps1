param([string]$ReportDirectory)
$ErrorActionPreference='Stop'
$info=[Diagnostics.ProcessStartInfo]::new()
$info.FileName='C:\Users\cabba\AppData\Local\OpenAI\Codex\bin\c0fd4db21735cce9\codex.exe'
$info.Arguments='app-server proxy'
$info.UseShellExecute=$false
$info.CreateNoWindow=$true
$info.RedirectStandardInput=$true
$info.RedirectStandardOutput=$true
$info.RedirectStandardError=$true
$proxy=[Diagnostics.Process]::new()
$proxy.StartInfo=$info
$result=[ordered]@{CheckedUtc=[DateTime]::UtcNow.ToString('o');Method='Existing app-server proxy, supported thread/list only, useStateDbOnly true. No raw session access, previews, or turns inspected or persisted.';Queried=$false;Threads=@();ExactCommitActorVerified=$false;MessageSent=$false}
try {
  [void]$proxy.Start()
  $proxy.StandardInput.WriteLine('{"id":1,"method":"initialize","params":{"clientInfo":{"name":"stem-physics-metadata-check","version":"1"}}}')
  $proxy.StandardInput.Flush()
  $deadline=[DateTime]::UtcNow.AddSeconds(15)
  $initialized=$false
  while ([DateTime]::UtcNow -lt $deadline) {
    $line=$proxy.StandardOutput.ReadLineAsync()
    if (-not $line.Wait(3000)) { $result.Blocker='Existing proxy returned no metadata response within the bounded wait'; break }
    if ($null -eq $line.Result) { $result.Blocker='Existing app-server control socket unavailable (proxy output ended)'; break }
    try { $message=$line.Result | ConvertFrom-Json } catch { continue }
    if ($message.id -eq 1) {
      if ($message.error) { $result.Blocker='Initialize rejected by existing app-server'; $result.ErrorCode=$message.error.code; break }
      $initialized=$true; break
    }
  }
  if ($initialized) {
    $proxy.StandardInput.WriteLine('{"method":"initialized"}')
    $proxy.StandardInput.WriteLine('{"id":2,"method":"thread/list","params":{"searchTerm":"physics","cwd":"C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated","limit":30,"sortKey":"updated_at","sortDirection":"desc","sourceKinds":[],"useStateDbOnly":true}}')
    $proxy.StandardInput.Flush()
    $result.Queried=$true
    $deadline=[DateTime]::UtcNow.AddSeconds(15)
    while ([DateTime]::UtcNow -lt $deadline) {
      $line=$proxy.StandardOutput.ReadLineAsync()
      if (-not $line.Wait(3000)) { $result.Blocker='Thread-list metadata response exceeded the bounded wait'; break }
      if ($null -eq $line.Result) { $result.Blocker='Proxy ended before thread-list response'; break }
      try { $message=$line.Result | ConvertFrom-Json } catch { continue }
      if ($message.id -eq 2) {
        if ($message.error) { $result.Blocker='Thread-list rejected by existing app-server'; $result.ErrorCode=$message.error.code }
        else {
          $result.Threads=@($message.result.data | ForEach-Object { [pscustomobject]@{Id=$_.id;Name=$_.name;Cwd=$_.cwd;SessionId=$_.sessionId;ParentThreadId=$_.parentThreadId;Model=$_.model;CreatedAt=$_.createdAt;UpdatedAt=$_.updatedAt;Status=$_.status;GitCommitAtCreation=$_.gitInfo.sha} })
          $result.MoreMetadataAvailable=($null -ne $message.result.nextCursor)
        }
        break
      }
    }
  }
} catch { $result.Blocker='Supported proxy lookup failed'; $result.ErrorType=$_.Exception.GetType().Name }
finally {
  if ($proxy.Id) {
    try { $proxy.StandardInput.Close() } catch {}
    $result.ProxyExitedAfterStdinClose=$proxy.WaitForExit(2000)
    $result.ProxyPid=$proxy.Id
    if ($proxy.HasExited) { $result.ProxyExitCode=$proxy.ExitCode }
  }
}
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $ReportDirectory 'physics-task-lookup.json') -Encoding UTF8
$result | ConvertTo-Json -Depth 5
