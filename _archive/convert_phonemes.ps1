$dir = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\Phoneme library"
$outFile = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\phoneme_bank.json"

$files = Get-ChildItem "$dir\*.webm"
$output = @{}

foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $b64 = [Convert]::ToBase64String($bytes)
    $output[$f.BaseName] = "data:audio/webm;base64," + $b64
    Write-Host "Converted: $($f.BaseName)"
}

$output | ConvertTo-Json | Out-File $outFile -Encoding UTF8
Write-Host "Done! Output saved to $outFile"
