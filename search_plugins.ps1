$f = 'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
$lines = [System.IO.File]::ReadAllLines($f)
$patterns = @('pluginCdn', 'stem_tool', 'pluginFiles', 'pluginList', 'loadStemPlugin')
for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($p in $patterns) {
        if ($lines[$i].Contains($p)) {
            $snippet = $lines[$i]
            if ($snippet.Length -gt 200) { $snippet = $snippet.Substring(0, 200) }
            Write-Host "$($i+1): $snippet"
            break
        }
    }
}
Write-Host "--- Done. Total lines: $($lines.Count) ---"
