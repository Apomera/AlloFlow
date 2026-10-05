# AquacultureLab saved investigation comparison enhancement

Completed locally on 2026-10-02. All changes remain unstaged and uncommitted. Nothing was pushed or deployed.

## What changed

Learners can choose two saved investigations below Saved experiments, review their original recorded outcomes side by side, swap selection order, revisit either complete original, and download one inert standalone comparison report. First and Second describe selection order. For annual investigations, each side is its original B annual outcome; each original A/B investigation, writing and captured notebook remains separate and intact. Snapshots retain their direct preview.

The review preserves original model versions, timestamps, settings, annual metrics and species outputs. It never recalculates an archive or fills missing B results with A results, live-model outputs, snapshot values or captured notes. Numeric differences are Second minus First and require matching explicit model versions, matching scopes and complete original B settings. Mixed scopes retain separate annual/snapshot rows. Missing, not stocked and not applicable states remain distinct from valid zero and false readiness. Percent differences use percentage points. Each annual extremum covers its own year and may occur in a different month. Stocking and environment changes retain combined-response cautions.

Changed original B settings have a dedicated section; species outcomes have their own disclosures. Duplicate archive IDs cannot be selected ambiguously. Renaming preserves selection IDs; removing a selected record leaves a replacement placeholder, and Undo restores its ID. Selection, swap, original review and download preserve the active and parked draft. Removal and Undo now restore keyboard focus to the stable Saved experiments heading.

Using saved B as A again provides an editable prediction or revised expectation before changing B. Focus stays in the field while typing. After a B input changes, that prediction is retained as the investigation's original expectation. Return restores the complete parked draft, including its prior notebook. No claim or explanation is generated.

Malformed environment/disturbance IDs, including inherited object keys and nonstring values, cannot establish complete recorded provenance. Valid model inputs, physiology and model version **2026.10-stock-feedback** are preserved.

## Verification

- The final unfiltered serial run passed **152/152 cases across 13 files**, including **20 new comparison cases**. One worker, unchanged 30-second case limit, no final skips or exclusions. See [focused-tests.json](focused-tests.json).
- Nine Chromium viewport executions passed in seven result groups: original comparison at 1280/390/320px; mixed scopes, model mismatch and legacy/support at 320px; representative current-model previews at 1280/390/320px. See [browser/results.json](browser/results.json).
- Browser checks covered native labels and disclosures, keyboard focus, stable selection IDs, frozen original numbers, swap direction, missing/provenance/applicability guards, read-only selection/export, original-record review, rename/remove/Undo, branch prediction and full parked draft restoration, standalone HTML and print media.
- All **22 recorded scoped WCAG A/AA scans** reported zero violations. **9 normal-view scans flagged color contrast for manual review**. Root and independent UX review accepted normal, forced-color, phone and print captures. These scans cover the widget and exported report; a full host accessibility audit was not run.
- Both runtime files pass Node syntax and scoped Git whitespace checks. The canonical/public pair is byte-identical LF with no CR bytes. The scoped index is empty. See [verification.json](verification.json).

Runtime SHA256: fb25eff41f00f3282e71d64dd2f689a7b69781502327f641a72b44ce5f8374ef

The initial 20-case result is retained in [initial-comparison-tests.json](initial-comparison-tests.json): 19 passed and one species check exceeded its unchanged limit. The unchanged isolated case passed in 1095 ms; [isolated-species-recovery.txt](isolated-species-recovery.txt) records that diagnostic. The final complete 152-case run supersedes both. Earlier [investigation-regressions.json](investigation-regressions.json) retains the 54-case interim check. The first browser attempt exposed nested select-label text; external labels fixed the production naming. A second attempt exposed an author-only nitrifier fixture typo, corrected to the library's nitrifiers ID. The final browser run passed.

## Reproduce

From the repository root:

~~~powershell
node --max-old-space-size=512 --max-semi-space-size=4 node_modules/vitest/vitest.mjs run tests/aquaculture_3d_accessibility.test.js tests/aquaculture_ecosystem_runtime.test.js tests/aquaculture_evidence_recovery.test.js tests/aquaculture_guided_questions.test.js tests/aquaculture_investigation_runtime.test.js tests/aquaculture_learning_runtime.test.js tests/aquaculture_mussel_health_runtime.test.js tests/aquaculture_pedagogy.test.js tests/aquaculture_seasonal_explorer.test.js tests/aquaculture_stock_feedback.test.js tests/aquaculture_saved_investigations.test.js tests/aquaculture_measurement_notebook.test.js tests/aquaculture_saved_comparison.test.js --maxWorkers=1 --testTimeout=30000
node reports/aquaculture-saved-comparison-2026-10-02/saved-comparison-browser-qa.cjs
~~~

The portable browser harness uses installed Playwright/Chromium, React UMD, axe-core and the repository's aquatic HTTP fixture/cache. It opens a temporary loopback server and closes its own browser/server. The saved-comparison-browser-qa.cjs copy changes only repository/output paths and its opening comment. Validation covers the widget fixture and reports; a full host/installer build was not run.

## Artifacts

The sample previews and report below use actual outputs from the current model. Deliberate future-version and legacy values are confined to separate QA fixtures.

- [Desktop comparison](browser/sample-saved-comparison-1280.png)
- [Phone comparison](browser/sample-saved-comparison-390.png)
- [320px comparison](browser/sample-saved-comparison-320.png)
- [Forced-color phone comparison](browser/sample-saved-comparison-390-forced-colors.png)
- [Complete sample comparison report](browser/sample-comparison-review-390.html)
- [Print comparison outcomes](browser/sample-comparison-report-print-390.png)
- [Print original investigation and captured provenance](browser/sample-comparison-report-original-print-390.png)

Files changed in this pass: canonical/public aquaculture runtime, tests/aquaculture_saved_comparison.test.js, this report folder, and the append-only handoff log. Previous aquaculture enhancements and unrelated shared work remain intact.
