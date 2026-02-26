$path = 'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
$content = Get-Content -Path $path -Raw

# 3. Refactor missed calls (header)
$content = $content.Replace("t('word_sounds.title', 'Word Sounds Studio')", "ts('word_sounds.title')")
$content = $content.Replace("t('word_sounds.subtitle', 'Design your phonics lesson')", "ts('word_sounds.subtitle')")

[System.IO.File]::WriteAllText($path, $content)
