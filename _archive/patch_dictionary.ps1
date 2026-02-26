$path = 'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
$patchPath = 'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\dictionary_patch.txt'
$content = Get-Content -Path $path -Raw
$patchKey = "    'common.done': 'Done'"
$patchContent = Get-Content -Path $patchPath -Raw
$newContent = $content.Replace($patchKey, $patchContent)
[System.IO.File]::WriteAllText($path, $newContent)
