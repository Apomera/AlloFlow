# AquacultureLab measurement notebook enhancement

Completed locally on 2026-10-02. All changes remain uncommitted; nothing was staged, pushed or deployed.

## What changed

Learners can record one annual outcome or the currently inspected monthly reading into an eight-reading notebook. Each capture freezes the exact model values, annual/monthly scope, species or shared-system context, units, A/B settings, model version, timestamp and monthly event. Zero readings remain zero; a missing species, an absent baseline and an inapplicable crop metric retain separate labels.

The notebook flags relevant changes to A, B or model rules and lists the changed inputs. Changing only the chart selection or writing does not change a capture. Restoring the original settings clears the settings warning without recalculating the numbers. A reading captured without A stays a B-only reading if a baseline is later added.

“Add reading to Evidence” appends one complete factual citation. It preserves the learner's claim, reasoning, next test, prediction and reflection. Earlier settings/model citations carry an explicit prefix. Duplicate citations and citations exceeding the Evidence field's 500-character capacity leave writing intact. Recording a reading does not create a claim, infer causality, or complete an investigation.

Saved investigations and standalone/portfolio HTML retain original captured readings and their settings. Reports compare captures with the saved investigation's settings and model version, independently of the live design. The notebook also survives local reload, portfolio backup/restore, preset changes and builder reset. Replay restores archived readings and parks the complete current draft. Using saved B as A starts an empty notebook and parks the earlier notebook; Return restores it. New captures keep the investigation at “Compare & explain” until saved.

Guided question choices now protect parked work. An incomplete imported A is excluded before it can be presented as a recorded baseline. Seasonal differences use percentage points for percentage indices and index points for /100 indices. Notebook and seasonal controls use system colors in forced-color mode.

The existing model version (2026.10-stock-feedback) and physiology rules were preserved.

## Verification

- One final serial run passed **132/132 focused cases across 12 files**, including **17 new measurement notebook cases**. No timeout changes, skips or permanent test exclusions were added. See [focused-tests.json](focused-tests.json).
- Four final local Chromium workflows passed: desktop 1280px, phone 390px, narrow phone 320px, and an independent eight-reading capacity workflow at 320px. See [browser/results.json](browser/results.json).
- Browser checks covered keyboard activation and native disclosures, exact annual/monthly/species/shared values, event provenance, chart-only freshness, frozen earlier settings, citation/duplicate/full-field protection, archived immutability, reload, removal, branching and draft restoration, parked guided-question protection, and standalone HTML/print output.
- All recorded scoped WCAG A/AA scans were clear, including normal and forced-color notebook/seasonal views and exported reports. No runtime errors or horizontal overflow were recorded.
- Root and independent UX review accepted the desktop, phone, forced-color and print screenshots. Science review checked sources, units, applicability, and saved-record provenance.
- Node syntax checks and scoped Git whitespace checks passed. The canonical/public runtime pair is byte-identical LF, with no CR bytes. No aquaculture files are staged.

Final runtime SHA256: 0f41695e6865a17e527f859dd43d26eeb9f5aab823df360274c0cc2b8c98c9d5

The earlier notebook-tests.json and investigation-tests.json retain intermediate results. The final focused-tests.json supersedes them. The first run exposed invalid fixtures and an updated archive label; the next regression run caught snapshot context wording. The first browser run found forced-color seasonal contrast; its final rerun passed after the system-color fix.

## Reproduce

From the repository root:

~~~powershell
node --max-old-space-size=512 --max-semi-space-size=4 node_modules/vitest/vitest.mjs run tests/aquaculture_3d_accessibility.test.js tests/aquaculture_ecosystem_runtime.test.js tests/aquaculture_evidence_recovery.test.js tests/aquaculture_guided_questions.test.js tests/aquaculture_investigation_runtime.test.js tests/aquaculture_learning_runtime.test.js tests/aquaculture_mussel_health_runtime.test.js tests/aquaculture_pedagogy.test.js tests/aquaculture_seasonal_explorer.test.js tests/aquaculture_stock_feedback.test.js tests/aquaculture_saved_investigations.test.js tests/aquaculture_measurement_notebook.test.js --maxWorkers=1 --testTimeout=30000
node reports/aquaculture-measurement-notebook-2026-10-02/measurement-browser-qa.cjs
~~~

The browser harness uses installed Playwright/Chromium, React UMD, axe-core and the repository's existing aquatic HTTP fixture/cache. It runs a temporary loopback server and closes its own browser/server when complete. The QA HTML is a fixture for the widget, not a full host/installer build.

## Artifacts

- [Desktop notebook](browser/measurement-notebook-1280.png)
- [Phone notebook](browser/measurement-notebook-390.png)
- [320px notebook](browser/measurement-notebook-320.png)
- [Forced-color notebook](browser/measurement-notebook-forced-colors-390.png)
- [Sample standalone investigation](browser/measurement-investigation-390.html)
- [Phone print capture settings](browser/report-measurements-print-390.png)

Files changed in this pass: canonical/public aquaculture runtime, tests/aquaculture_measurement_notebook.test.js, this report folder, and the append-only handoff log. Prior aquaculture enhancements and unrelated shared work remain intact.
