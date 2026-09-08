# Document remediation calibration

This harness evaluates the **current** verification, distribution, and PDF delivery policies. It calls the repository's canonical functions; it does not fit a blended score or turn validator pass counts into expert scores.

## Evidence is kept separate

- `synthetic_cases.json`: 13 authored policy snapshots covering worksheets, readings, tables, scans, forms, and figures. These test expected behavior; no documents were remediated or reviewed to create them.
- `manifest.json`: observations of actual artifacts. It is **empty** until observations are imported. An entry without completed human findings remains `unreviewed`.
- `review_template.json`: an unfinished review form. It supplies no reviewer, verdict, or findings.

A passing synthetic suite is not human calibration, live-provider quality evidence, a usability test, or conformance certification. Empty/unreviewed corpora report `humanMetrics: null`; synthetic counts never enter human metrics. Imported reviewer identity and independence are declarations, not authenticated credentials.

## Run

```powershell
node dev-tools/evaluate_pdf_calibration.cjs
node dev-tools/evaluate_pdf_calibration.cjs --synthetic
node node_modules/vitest/vitest.mjs run tests/pdf_score_calibration.test.js tests/pdf_calibration_ingest.test.js --maxWorkers=1
```

Use `--output report.json` to save a report. The synthetic report includes explicit expectation mismatches. The two test files fail when those expectations drift.

## Record observations and human findings

1. Save the exact output artifact and its observed result/audits. Use a unique run/artifact ID; a new version gets a new ID. The observation JSON contains:

```json
{
  "id": "worksheet-run-001",
  "documentKind": "worksheet",
  "evidenceKind": "unreviewed",
  "artifact": { "sha256": "SHA-256 of the exact output bytes" },
  "observed": {
    "targetScore": 95,
    "verification": { "ai": null, "axe": null, "equalAccess": null },
    "result": {},
    "pdf": { "produced": false }
  }
}
```

Replace the nulls with **actual** audit objects, including their finding/review counts and actual AI chunksRequested/chunksAudited. Copy measured `afterScore`, `integrityCoverage`, `fidelityNotes`, `needsExpertReview`, `expertReviewReason`, and `fidelityLimited` into `result` when available. Missing measurements stay missing. Include `aiIncomplete` in `verification` and `inProgress` in `observed` if applicable. For a PDF, provide `pdf.produced: true`, its actual `taggedPdfVerified`, and `pdf.validation` in the shared `normalizePdfUaValidation` schema. Validator evidence must identify the same PDF hash/size/profile; invalid or unbound validation remains unavailable.

2. Import an observation without implying a human review:

```powershell
node dev-tools/pdf_calibration_ingest.cjs --observation observation.json --artifact output.pdf --dry-run
node dev-tools/pdf_calibration_ingest.cjs --observation observation.json --artifact output.pdf
```

3. After an actual independent human review, copy the template and enter `status: "completed"`, `method: "human"`, `independent: true`, a reviewer identifier, ISO review time, a reference to review notes, and the exact artifact SHA-256. Set `readiness` to `ready`, `caution`, `review-required`, or `unavailable`. Record assessed `layers` using `ai`, `axe`, `equalAccess`, `fidelity`, and `export`, with outcomes `passed`, `failed`, `review-required`, `partial`, `unavailable`, or `not-applicable`. Omit unassessed layers.

Each finding contains `id`, `layer`, `summary`, and a human-checked `detectedByAutomation` boolean. The notes should explain what was checked and where the issue appears. Then import with `--review findings.json` and a new ID if the earlier observation is already stored. Review and observation hashes must match the actual `--artifact` file. Use `--manifest path` for a private corpus; do not commit sensitive learner documents or reviewer information.

## What the report measures

- Current verification coverage/status for AI, axe, and Equal Access; fidelity warning status; independently validated PDF export status.
- Null-safe weakest-layer score and the actual reported score separately. This is a snapshot-policy replay, not a re-execution of extraction, remediation, browser proof binding, or final score deductions.
- Declared human review outcomes versus predicted distribution: false-ready outcomes, unnecessary review, and per-layer disagreements.
- Human-recorded findings missed by automation, per layer. These are counts of the findings reviewed, not a claim that the finding list is exhaustive.

`ready` and `caution` count as distributable in the comparison; `review-required` and `unavailable` do not. Always inspect scope and provisional-run notes. A layer's advisory status is not an expert score. No MAE or reweighting recommendation is produced from unrelated validator counts.
