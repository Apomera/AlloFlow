$results = Select-String -Path 'prismflow-deploy\src\App.jsx' -Pattern 'fixAndVerifyPdf'
foreach ($r in $results | Select-Object -First 15) {
    $line = $r.Line.Trim()
    if ($line.Length -gt 160) { $line = $line.Substring(0, 160) }
    Write-Output "Line $($r.LineNumber): $line"
}
