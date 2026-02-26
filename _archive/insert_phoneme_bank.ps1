$sourcePath = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
$phonemeBankPath = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\phoneme_audio_bank.js"
$outputPath = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

# Read files
$sourceContent = Get-Content $sourcePath -Raw
$phonemeBankContent = Get-Content $phonemeBankPath -Raw

# Find the marker where to insert (after speakPhoneme function, before SAFETY_BLACKLIST)
$marker = "// --- SAFETY & VALIDATION ---"

if ($sourceContent.Contains($marker)) {
    # Insert the phoneme bank right before the safety section
    $newContent = $sourceContent -replace [regex]::Escape($marker), "$phonemeBankContent`r`n`r`n$marker"
    
    # Write back
    $newContent | Out-File $outputPath -Encoding UTF8 -NoNewline
    Write-Host "SUCCESS: Inserted phoneme audio bank into AlloFlowANTI.txt"
    Write-Host "New file size: $((Get-Item $outputPath).Length) bytes"
} else {
    Write-Host "ERROR: Marker not found in source file"
}
