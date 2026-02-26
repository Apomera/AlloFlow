$inputFile = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\phoneme_bank.json"
$outputFile = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\phoneme_audio_bank.js"

# Read the JSON
$json = Get-Content $inputFile -Raw | ConvertFrom-Json

# Build the JavaScript constant
$jsContent = "// PHONEME AUDIO BANK - High quality pre-generated phoneme audio`r`n"
$jsContent += "// Generated from 42 WebM files in Phoneme library folder`r`n"
$jsContent += "const PHONEME_AUDIO_BANK = {`r`n"

$properties = $json.PSObject.Properties
$count = 0
$total = ($properties | Measure-Object).Count

foreach ($prop in $properties) {
    $count++
    $comma = if ($count -lt $total) { "," } else { "" }
    $jsContent += "    '" + $prop.Name + "': '" + $prop.Value + "'$comma`r`n"
}

$jsContent += "};`r`n"

# Write to output file
$jsContent | Out-File $outputFile -Encoding UTF8
Write-Host "Generated $outputFile with $count phonemes"
Write-Host "File size: $((Get-Item $outputFile).Length) bytes"
