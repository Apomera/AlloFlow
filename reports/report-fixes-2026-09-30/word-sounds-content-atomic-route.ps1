$ErrorActionPreference = 'Stop'
$wordSoundsRoot = [System.IO.Path]::GetFullPath((Get-Location).Path)
$wordSoundsTarget = [System.IO.Path]::Combine($wordSoundsRoot, 'word_sounds_module.js')
$wordSoundsCandidate = [System.IO.Path]::Combine($wordSoundsRoot, 'reports', 'report-fixes-2026-09-30', 'word-sounds-content-final-route-candidate.js')
$wordSoundsBackup = [System.IO.Path]::Combine($wordSoundsRoot, 'reports', 'report-fixes-2026-09-30', 'word-sounds-content-route-atomic-backup.js')
$wordSoundsExpected = Get-Content -Raw -LiteralPath 'reports/report-fixes-2026-09-30/word-sounds-content-final-route-candidate.json' | ConvertFrom-Json
if (Test-Path -LiteralPath $wordSoundsBackup) { throw 'Atomic-route backup already exists; inspect instead of retrying.' }
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $wordSoundsTarget).Hash.ToLowerInvariant() -ne $wordSoundsExpected.before) { throw 'Player changed before atomic replacement.' }
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $wordSoundsCandidate).Hash.ToLowerInvariant() -ne $wordSoundsExpected.after) { throw 'Candidate changed before atomic replacement.' }
[System.IO.File]::Replace($wordSoundsCandidate, $wordSoundsTarget, $wordSoundsBackup)
$wordSoundsAfter = (Get-FileHash -Algorithm SHA256 -LiteralPath $wordSoundsTarget).Hash.ToLowerInvariant()
if ($wordSoundsAfter -ne $wordSoundsExpected.after) { throw 'Unexpected player hash after replacement; original is preserved in backup.' }
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $wordSoundsBackup).Hash.ToLowerInvariant() -ne $wordSoundsExpected.before) { throw 'Unexpected atomic backup hash.' }
@{ before = $wordSoundsExpected.before; after = $wordSoundsAfter; originalPreserved = $true } | ConvertTo-Json -Compress
