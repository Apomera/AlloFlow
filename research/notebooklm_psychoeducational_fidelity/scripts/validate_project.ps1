$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ErrorsFound = New-Object System.Collections.Generic.List[string]

$RequiredFiles = @(
    'README.md',
    'AI_GOVERNANCE.md',
    'DECISION_LOG.md',
    'PROTOCOL.md',
    'PREREGISTRATION.md',
    'CODEBOOK.md',
    'schemas/case.schema.json',
    'schemas/claim-ledger.schema.json',
    'data/templates/case_manifest.csv',
    'data/templates/source_manifest.csv',
    'data/templates/output_manifest.csv',
    'data/templates/claim_annotations.csv',
    'data/templates/citation_annotations.csv',
    'data/templates/omission_annotations.csv',
    'data/templates/case_validation.csv',
    'data/templates/human_interventions.csv',
    'analysis/README.md',
    'manuscript/MANUSCRIPT.md',
    'references/EVIDENCE_MAP.md',
    'case_blueprints/PILOT_CASE_MATRIX.md',
    'case_blueprints/CASE_REVIEW_STANDARD.md',
    'provenance/ai_activity_log.csv',
    'provenance/protocol_deviations.csv'
)

foreach ($RelativePath in $RequiredFiles) {
    $FullPath = Join-Path $ProjectRoot $RelativePath
    if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
        $ErrorsFound.Add("Missing required file: $RelativePath")
        continue
    }
    if ((Get-Item -LiteralPath $FullPath).Length -eq 0) {
        $ErrorsFound.Add("Required file is empty: $RelativePath")
    }
}

$JsonFiles = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'schemas') -Filter '*.json' -File
foreach ($JsonFile in $JsonFiles) {
    try {
        $JsonObject = Get-Content -Raw -LiteralPath $JsonFile.FullName | ConvertFrom-Json
        if (-not $JsonObject.'$schema') {
            $ErrorsFound.Add("JSON schema declaration missing: $($JsonFile.Name)")
        }
        if (-not $JsonObject.required) {
            $ErrorsFound.Add("Top-level required array missing: $($JsonFile.Name)")
        }
    }
    catch {
        $ErrorsFound.Add("Invalid JSON in $($JsonFile.Name): $($_.Exception.Message)")
    }
}

$CaseFiles = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'case_blueprints') -Filter 'case.json' -Recurse -File
foreach ($CaseFile in $CaseFiles) {
    try {
        $CaseObject = Get-Content -Raw -LiteralPath $CaseFile.FullName | ConvertFrom-Json
        if ($CaseObject.synthetic_only -ne $true) {
            $ErrorsFound.Add("Case is not explicitly synthetic-only: $($CaseFile.FullName)")
        }
        $CaseDirectory = Split-Path -Parent $CaseFile.FullName
        $SourceIds = @($CaseObject.sources | ForEach-Object { $_.source_id })
        foreach ($Source in $CaseObject.sources) {
            $SourcePath = Join-Path $CaseDirectory $Source.content_file
            if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
                $ErrorsFound.Add("Missing source file for $($CaseObject.case_id): $($Source.content_file)")
            }
        }

        $LedgerPath = Join-Path $CaseDirectory 'ledger.json'
        if (-not (Test-Path -LiteralPath $LedgerPath -PathType Leaf)) {
            $ErrorsFound.Add("Missing ledger for $($CaseObject.case_id)")
            continue
        }
        $LedgerObject = Get-Content -Raw -LiteralPath $LedgerPath | ConvertFrom-Json
        if ($LedgerObject.case_id -ne $CaseObject.case_id) {
            $ErrorsFound.Add("Case/ledger ID mismatch in $CaseDirectory")
        }
        $LedgerIds = @($LedgerObject.entries | ForEach-Object { $_.ledger_id })
        $DuplicateLedgerIds = $LedgerIds | Group-Object | Where-Object { $_.Count -gt 1 }
        if ($DuplicateLedgerIds) {
            $ErrorsFound.Add("Duplicate ledger IDs in $($CaseObject.case_id): $($DuplicateLedgerIds.Name -join ', ')")
        }
        foreach ($LedgerEntry in $LedgerObject.entries) {
            foreach ($Locator in $LedgerEntry.source_locators) {
                if ($SourceIds -notcontains $Locator.source_id) {
                    $ErrorsFound.Add("Unknown source ID $($Locator.source_id) in ledger entry $($LedgerEntry.ledger_id)")
                }
            }
        }
    }
    catch {
        $ErrorsFound.Add("Invalid case or ledger JSON at $($CaseFile.FullName): $($_.Exception.Message)")
    }
}

$CsvFiles = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'data/templates') -Filter '*.csv' -File
$CsvFiles += Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'provenance') -Filter '*.csv' -File
foreach ($CsvFile in $CsvFiles) {
    $HeaderLine = Get-Content -LiteralPath $CsvFile.FullName -TotalCount 1
    if ([string]::IsNullOrWhiteSpace($HeaderLine)) {
        $ErrorsFound.Add("CSV header missing: $($CsvFile.Name)")
        continue
    }
    $Headers = $HeaderLine.Split(',')
    $DuplicateHeaders = $Headers | Group-Object | Where-Object { $_.Count -gt 1 }
    if ($DuplicateHeaders) {
        $ErrorsFound.Add("Duplicate CSV headers in $($CsvFile.Name): $($DuplicateHeaders.Name -join ', ')")
    }
}

$DecisionText = Get-Content -Raw -LiteralPath (Join-Path $ProjectRoot 'DECISION_LOG.md')
$DecisionIds = [regex]::Matches($DecisionText, '\| (D\d{3}) \|') | ForEach-Object { $_.Groups[1].Value }
$DuplicateDecisionIds = $DecisionIds | Group-Object | Where-Object { $_.Count -gt 1 }
if ($DuplicateDecisionIds) {
    $ErrorsFound.Add("Duplicate decision IDs: $($DuplicateDecisionIds.Name -join ', ')")
}

$ProtocolText = Get-Content -Raw -LiteralPath (Join-Path $ProjectRoot 'PROTOCOL.md')
if ($ProtocolText -notmatch 'no NotebookLM study outputs collected') {
    $ErrorsFound.Add('Protocol does not state the pre-data status.')
}

if ($ErrorsFound.Count -gt 0) {
    Write-Output "VALIDATION_FAILED count=$($ErrorsFound.Count)"
    $ErrorsFound | ForEach-Object { Write-Output "ERROR $_" }
    exit 1
}

$PlaceholderCount = (rg -o '\[TO FREEZE|\[TO COMPLETE|\[TO BE DETERMINED' $ProjectRoot | Measure-Object).Count
$FileCount = (Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File | Measure-Object).Count
Write-Output "VALIDATION_OK files=$FileCount json_schemas=$($JsonFiles.Count) case_blueprints=$($CaseFiles.Count) csv_files=$($CsvFiles.Count) unresolved_placeholders=$PlaceholderCount"
