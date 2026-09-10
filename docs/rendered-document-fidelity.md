# Rendered source fidelity and synthetic calibration

`dev-tools/rendered_document_fidelity.cjs` compares source-authored checkpoints in complete source and candidate HTML documents. It uses Chromium computed state and the native accessibility tree. It runs after export as an optional part of the existing acceptance report, or as a standalone tool. It does not change the live remediation candidate gate, scores, or production delivery policy.

Each document is rendered in its own browser context. Document JavaScript, service workers, and network requests are blocked. Script-dependent documents, unresolved resources (including unloaded external media, CSS dependencies, and external responsive-image candidates), and active or delayed animations produce incomplete coverage. Dependency inspection is shared with baseline export acceptance: inert data scripts, embedded data images and responsive image sets, and local SVG references remain supported. Files must contain valid UTF-8 with compatible charset declarations. Reports bind the exact source and candidate bytes by SHA-256 and record the browser version, rendering profiles, selected properties, and timing. Changed files are marked unavailable.

## Standalone use

Author expectations from the source. Select each intended element uniquely; do not generate expectations from the candidate being evaluated. Save this manifest beside the two HTML files:

```json
{
  "schemaVersion": 1,
  "pairs": [{
    "id": "reading",
    "sourcePath": "original.html",
    "candidatePath": "remediated.html",
    "viewport": { "width": 1100, "height": 800 },
    "checkpoints": [
      { "id": "instruction", "sourceSelector": "#instruction", "properties": ["text", "visible", "exposed"] },
      { "id": "student", "sourceSelector": "#student", "properties": ["name", "disabled", "value"] },
      { "id": "topic-link", "sourceSelector": "#topic-link", "properties": ["targetText"] }
    ]
  }]
}
```

```powershell
node dev-tools/rendered_document_fidelity.cjs manifest.json reports/new-rendered-check
```

The command writes `rendered-fidelity.json` and a self-contained `review.html`. The HTML report shows selected source/candidate observations, incomplete-coverage reasons, and exact artifact hashes. It renders document content as escaped text and needs no scripts or external assets.

Use a fresh output directory. Existing output is refused. Reports can contain local source text and accessible names; handle them with the same care as the documents.

Available properties: `text`, `visible`, `exposed`, `name`, `role`, `disabled`, `value`, `checked`, `selected`, `href`, `targetText`, `language`, and `direction`. `candidateSelector` may identify the corresponding candidate element when its ID changes. `targetText` is available only for same-document links; pair it with `href` when exact destination preservation is required.

Choose properties to match the repair policy. For example, preserve cell text while allowing a cell to become a header; do not require the old role in that case. A source element becoming visible/exposed is allowed. An accessible name may be added when the source had none. Existing names, text, and selected form properties otherwise require equality. Text uses Unicode canonical normalization (NFC), preserving meaningful differences such as `x²` versus `x2`. These rules are deliberately explicit; a corrected source name needs a separately reviewed contract.

Pairing `text` with `visible` also checks visible descendant text, and pairing `text` with `exposed` checks descendant text in Chromium’s accessibility tree. Reports include these derived checks as `visibleText` and `exposedText`, with occurrence ranges anchored to offsets in the complete NFC-normalized checkpoint text. Each originally visible or exposed occurrence must survive at its original text position; revealing a duplicate cannot compensate for losing a word from the original instruction. Harmless markup rewrapping, canonical Unicode equivalents, and restoration of previously hidden text remain allowed. Native accessibility text nodes are associated with their DOM text nodes; unavailable mappings prevent a complete pass. Accessible alternatives without DOM text retain an additional ordered-text check; use explicit `name` checkpoints when those alternatives require occurrence-level identity. Container visibility or exposure alone does not establish preservation of every word. These observations are not a screen reader transcript.

For `selected` on a select control, reports retain each selected option’s index, value, and normalized label; equal submitted values cannot conceal a different choice. Relative `href` observations retain the literal reference alongside browser resolution because the isolated rendering origin is not the document’s deployment base. This is conservative: changing the spelling of a relative reference requires review even if it might resolve equivalently at one deployment location. Absolute URLs retain browser normalization.

There are limits of 8 MiB per document, 100 checkpoints per profile, 4 profiles per pair, and 50 pairs per CLI manifest. Missing or ambiguous selectors, unsupported observations, oversized requested observations (including structured selections and derived text evidence), script dependencies, and blocked resources cannot count as complete passes.

## Desktop, mobile, and print checks

Replace a pair's single `viewport` with explicit profiles to check responsive and print styles:

```json
"profiles": [
  { "id": "desktop", "viewport": { "width": 1100, "height": 800 }, "media": "screen" },
  { "id": "mobile", "viewport": { "width": 390, "height": 844 }, "media": "screen" },
  { "id": "print", "viewport": { "width": 1100, "height": 800 }, "media": "print" }
]
```

Do not combine `profiles` with top-level `viewport` or `media`. IDs must be unique. The default remains one 1100×800 screen profile. Each profile uses separate source/candidate contexts and the same source-authored checkpoints. Print emulation checks CSS media behavior; it does not assess PDF pagination or printed-page layout. A mobile profile changes viewport dimensions, not touchscreen or mobile browser behavior.

Every profile must pass for the aggregate to pass. A detected difference takes priority as `review-required`, while `coverage.complete` remains false if any checkpoint property or rendering dependency was unavailable. The report retains both facts and identifies the affected profile. Selected-checkpoint coverage never means whole-document coverage.

## Inspection failures and batch recovery

Browser context setup, navigation, accessibility inspection, dependency inspection, and context cleanup failures are recorded as unavailable coverage with bounded diagnostics. Successful observations remain available for review. Other source/candidate sides and rendering profiles still run. For multi-profile reports, `profilesAttempted` counts attempted profiles; `profilesCompleted` counts profiles whose source and candidate browser inspections both completed. A completed inspection may still detect a change or incomplete document dependencies.

The standalone manifest requires unique pair IDs and valid checkpoint/profile contracts. Malformed contracts fail before browser work. Within a valid manifest, an unreadable or incompatible HTML file produces an unavailable pair while later pairs still run; the CLI writes both JSON and HTML results and returns exit code 1 if any pair cannot pass. A manifest error or inability to start Chromium returns exit code 2.

The manifest's exact byte hash is recorded. Before returning a batch, the runner rechecks the manifest and all inspected source/candidate files, including earlier pairs. Changed or missing files invalidate the affected reports. The exported `runRenderedManifest(manifestPath, { browser })` function also supports a caller-owned browser.

## Existing export acceptance reports

For an HTML artifact in the schema-1 manifest consumed by `document_export_at_acceptance.cjs`, add:

```json
"sourceFidelity": {
  "sourcePath": "original.html",
  "checkpoints": [
    { "id": "instruction", "sourceSelector": "#instruction", "properties": ["text", "visible", "exposed"] }
  ]
}
```

The same optional `profiles` array can be included inside `sourceFidelity`. The CLI writes `rendered-fidelity-review.html` when rendered reports are present.

The source path is relative to the manifest. The artifact's existing `path` supplies the candidate. `renderedFidelity` is included in the artifact report, and `html.rendered-source-fidelity` joins its automated checks. A detected change or unavailable comparison prevents that automated report from passing. The normal manual template and human-acceptance status remain `not-run` / `pending-human-at`. Every HTML/PDF artifact is inspected from its captured bytes and rechecked for changes at completion. Optional rendered sources are also rechecked. Artifacts without `sourceFidelity` receive no rendered source comparison. PDF source comparisons are currently unsupported and report unavailable.

## Calibration

```powershell
node dev-tools/calibrate_rendered_fidelity.cjs reports/new-rendered-calibration
node node_modules/@playwright/test/cli.js test tests/e2e/rendered_document_fidelity.spec.ts tests/e2e/rendered_fidelity_profiles.spec.ts --workers=1 --retries=0
```

The corpus in `tests/fixtures/rendered_fidelity/cases.cjs` and `extended_cases.cjs` contains 29 authored HTML pairs across tables, CSS/visibility, responsive and print styles, forms, links, math, Unicode, figures, and media dependencies: eight valid repairs, eighteen harmful changes, and three intentionally unavailable cases. The runner writes each source, candidate, and result, plus corpus/implementation hashes, aggregate metrics, and a combined `review.html`. Unexpectedly unavailable cases are separate from false rejections. The runner hashes the loaded input files and actual fixture payload before inspection and verifies those files at completion. Changed inputs make calibration evidence incomplete and return a nonzero CLI exit code. Human metrics remain null.

These are synthetic calibration results, not production error rates, live-model quality measurements, OCR accuracy, or screen-reader acceptance. The checks cover only selected source elements and properties. Visibility does not prove contrast, absence of occlusion, or the usefulness of descriptions. Representative documents, PDF semantics, scans, figure-description quality, and actual screen-reader sessions should follow the [human validation handoff](document-remediation-fidelity-validation.md).
