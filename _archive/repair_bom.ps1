$path = 'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
$lines = Get-Content -Path $path
# Remove lines 871 and 872 (index 870 and 871)
# Create a valid list excluding those lines
$newLines = $lines[0..869] + $lines[872..($lines.Count - 1)]
Set-Content -Path $path -Value $newLines -Encoding UTF8
