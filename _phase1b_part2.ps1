# Phase 1b Part 2: Line-based fixes for remaining WCAG issues
# Uses line-by-line approach for reliability with large files

$file = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
$lines = [System.IO.File]::ReadAllLines($file)
$count = 0

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    
    # ── Fix: Lesson-plan </h4> → </h3> where the opening tag is <h3> ──
    # Lines 33963, 33971, 33977, 33984, 33990, 33997 (0-indexed: -1)
    if ($line -match '^\s+</h4>\s*$' -and $i -gt 0) {
        # Check if the h3 opening is 1-2 lines before
        $prevLine = $lines[$i-1]
        $prev2Line = if ($i -gt 1) { $lines[$i-2] } else { "" }
        if ($prevLine -match '<h3\s' -or $prev2Line -match '<h3\s') {
            $lines[$i] = $line -replace '</h4>', '</h3>'
            $count++
            Write-Host "[OK] Line $($i+1): </h4> -> </h3> (matched h3 opener)"
        }
    }
    
    # ── Fix: Lesson-plan <h4> → <h3> for materials, essentialQuestion ──
    if ($line -match '<h4 style=.*text-transform: uppercase' -and ($line -match 'color: #059669' -or $line -match 'color: #7c3aed')) {
        $lines[$i] = $line -replace '<h4 ', '<h3 '
        $count++
        Write-Host "[OK] Line $($i+1): <h4> -> <h3> (lesson subheader)"
        # Fix the closing tag too
        for ($j = $i+1; $j -lt [Math]::Min($i+4, $lines.Length); $j++) {
            if ($lines[$j] -match '</h4>') {
                $lines[$j] = $lines[$j] -replace '</h4>', '</h3>'
                $count++
                Write-Host "[OK] Line $($j+1): closing </h4> -> </h3>"
                break
            }
        }
    }
    
    # ── Fix: Add aria-hidden to lesson-plan emoji spans ──
    if ($line -match '<span style="margin-right:6px;">' -and $line -match '&#\d+;' -and $line -notmatch 'aria-hidden') {
        $lines[$i] = $line -replace '<span style="margin-right:6px;">', '<span aria-hidden="true" style="margin-right:6px;">'
        $count++
        Write-Host "[OK] Line $($i+1): aria-hidden on emoji span"
    }
    
    # ── Fix: Analysis section - add role="region" ──
    if ($line -match '<div class="section" id="\$\{item\.id\}">' -and $i -gt 0) {
        # Check if we're in the analysis block by looking back for 'analysis'
        $contextWindow = ""
        for ($c = [Math]::Max(0, $i-10); $c -le $i; $c++) {
            $contextWindow += $lines[$c]
        }
        if ($contextWindow -match "item\.type === 'analysis'") {
            $lines[$i] = $line -replace '<div class="section" id="\$\{item\.id\}">', '<div class="section" id="${item.id}" role="region" aria-label="${title}">'
            $count++
            Write-Host "[OK] Line $($i+1): analysis role=region"
        }
    }
    
    # ── Fix: Timeline decorative dot - add aria-hidden ──
    if ($line -match 'left: -32px.*background: #4f46e5.*border-radius: 50%' -and $line -notmatch 'aria-hidden') {
        $lines[$i] = $line -replace '<div style="position: absolute; left: -32px', '<div aria-hidden="true" style="position: absolute; left: -32px'
        $count++
        Write-Host "[OK] Line $($i+1): timeline dot aria-hidden"
    }
    
    # ── Fix: Concept-sort category header div → h3 ──
    if ($line -match 'background:\$\{catColor\};color:white; padding: 10px; font-weight: bold; text-align: center;') {
        $lines[$i] = $line -replace '<div style="background:\$\{catColor\}', '<h3 style="margin:0;font-size:1em;background:${catColor}'
        $count++
        Write-Host "[OK] Line $($i+1): concept-sort header div->h3"
        # Fix closing tag
        for ($j = $i+1; $j -lt [Math]::Min($i+4, $lines.Length); $j++) {
            if ($lines[$j] -match '^\s+\$\{cat\.label\}\s*$') {
                # The closing </div> is on the next line after cat.label
                if ($j+1 -lt $lines.Length -and $lines[$j+1] -match '^\s+</div>\s*$') {
                    $lines[$j+1] = $lines[$j+1] -replace '</div>', '</h3>'
                    $count++
                    Write-Host "[OK] Line $($j+2): concept-sort header closing -> </h3>"
                }
                break
            }
        }
    }
    
    # ── Fix: Concept-sort item - add role="listitem" ──  
    if ($line -match 'flex: 1; min-width: 200px; border: 2px solid \$\{catColor\}33' -and $line -notmatch 'role=') {
        $lines[$i] = $line -replace '<div style="flex:', '<div role="listitem" style="flex:'
        $count++
        Write-Host "[OK] Line $($i+1): concept-sort item role=listitem"
    }
}

# ── Fix: Concept-sort flex container - add role="list" ──
# Needs context-awareness, so we use a targeted approach
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match 'display: flex; flex-wrap: wrap; gap: 20px;' -and $lines[$i] -notmatch 'role=') {
        # Check if this is the concept-sort one by looking at nearby lines
        $nearbyContext = ""
        for ($c = [Math]::Max(0, $i-5); $c -le [Math]::Min($i+5, $lines.Length-1); $c++) {
            $nearbyContext += $lines[$c]
        }
        if ($nearbyContext -match 'categories\.map') {
            $lines[$i] = $lines[$i] -replace 'gap: 20px;">', 'gap: 20px;" role="list">'
            $count++
            Write-Host "[OK] Line $($i+1): concept-sort container role=list"
        }
    }
}

[System.IO.File]::WriteAllLines($file, $lines)
Write-Host "`n=== Applied $count remaining Phase 1b fixes ==="
