# Final pass: fix remaining unlabeled buttons, inputs, selects
$file = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\symbol_studio_module.js"
$lines = [System.IO.File]::ReadAllLines($file)
$count = 0

# --- Fix remaining multi-line buttons ---
for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if ($line -match 'aria-label') { continue }
    if ($line -notmatch "e\('button'") { continue }
    
    # Collect up to 6 lines to find button text
    $block = ""
    for ($j = $i; $j -lt [Math]::Min($i + 6, $lines.Length); $j++) {
        $block += $lines[$j] + "`n"
    }
    
    # Find text content patterns
    $foundText = $null
    if ($block -match "'([A-Za-z][^']{1,40})'\s*\)") {
        $foundText = $Matches[1]
    }
    
    if (-not $foundText) { continue }
    
    # Clean for aria-label - remove emoji chars (common ranges)
    $cleanText = $foundText -replace '[^a-zA-Z0-9\s\-\+\.\(\)/,]', '' -replace '^\s+|\s+$', '' -replace '\s{2,}', ' '
    if ($cleanText.Length -lt 2) { continue }
    
    # Find the best line to insert on (the one with style:)
    $inserted = $false
    for ($k = $i; $k -lt [Math]::Min($i + 4, $lines.Length); $k++) {
        if ($lines[$k] -match 'aria-label') { $inserted = $true; break }
        if ($lines[$k] -match "style:" -and $lines[$k] -notmatch "aria-label") {
            $lines[$k] = $lines[$k] -replace "style:", "'aria-label': '$cleanText', style:"
            $count++
            $inserted = $true
            break
        }
    }
}

# --- Fix unlabeled inputs ---
for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if ($line -match 'aria-label') { continue }
    if ($line -notmatch "e\('input'") { continue }
    
    if ($line -match "placeholder:\s*'([^']+)'") {
        $placeholder = $Matches[1] -replace '[^a-zA-Z0-9\s\-]', '' -replace '^\s+|\s+$', ''
        if ($placeholder.Length -ge 2) {
            $lines[$i] = $line -replace "placeholder:", "'aria-label': '$placeholder', placeholder:"
            $count++
        }
    }
}

# --- Fix unlabeled selects ---
for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if ($line -match 'aria-label') { continue }
    if ($line -notmatch "e\('select'") { continue }
    
    # Try to find context from the line before (usually a label)
    if ($i -gt 0) {
        $prevLine = $lines[$i - 1]
        if ($prevLine -match "'([^']{3,30})'") {
            $labelText = $Matches[1] -replace '[^a-zA-Z0-9\s\-]', '' -replace '^\s+|\s+$', ''
            if ($labelText.Length -ge 2 -and $line -match "style:") {
                $lines[$i] = $line -replace "style:", "'aria-label': '$labelText', style:"
                $count++
            }
        }
    }
}

[System.IO.File]::WriteAllLines($file, $lines)
Write-Host "Applied $count additional fixes"

# Final counts
$btnMissing = 0; $inputMissing = 0; $selectMissing = 0
foreach ($l in $lines) {
    if ($l -match "e\('button'" -and $l -notmatch "aria-label") { $btnMissing++ }
    if ($l -match "e\('input'" -and $l -notmatch "aria-label") { $inputMissing++ }
    if ($l -match "e\('select'" -and $l -notmatch "aria-label") { $selectMissing++ }
}
Write-Host "Remaining: buttons=$btnMissing, inputs=$inputMissing, selects=$selectMissing"
