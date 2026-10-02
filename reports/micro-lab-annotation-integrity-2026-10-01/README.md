# Micro Lab: preserve annotations and imported evidence

October 1, 2026

## Changes

Growth explanations and Resistance reflections now update only the selected record's annotation. Direct selection of saved trials or snapshots updates only the selected ID. These actions preserve raw imported overflow rows, original evidence, metadata, working drafts, recovery records, Growth citations, and Resistance comparison preferences.

Updates use the latest saved state and verify the original record's identity. Replaced records, stale selections, activity changes, and generated repair IDs cannot receive a stale annotation or navigation action. Unchanged text and selection return the original state. Typing keeps its textarea and caret; deferred Growth focus also checks record ownership.

Imported entries with missing or duplicate IDs remain readable. Their generated selection buttons are disabled with an explanation. Valid original IDs remain selectable. Existing explicit save, removal, restoration, comparison repair, and Home repair workflows keep their established behavior. Displays and exports retain their existing supported-record limits; these note edits and direct selections preserve extra raw rows without extending export scope.

Completed restored Resistance runs without an original prediction now report the actual observed trend and rounded percentage-point change. Similar-share outcomes show their actual change, and extinction keeps the resistant share undefined. Prediction comparisons still require an original saved prediction. Editing reflections does not advance the simulation or regrade work.

## Validation

The final results are recorded in [validation-summary.json](validation-summary.json), [unit-results.json](unit-results.json), and [browser-results.json](browser-results.json). The summary requires successful runner exits, a stable runtime SHA256, identical source and desktop copies, and complete translation coverage before it can be generated.

- 723 unit checks across 22 files.
- 49 Chromium scenarios with one worker, no retries, and no skipped cases.
- 1,888 source-used interface labels; no missing labels or changed fallbacks. Both Micro Lab translation namespaces match.
- Syntax checks for both runtime copies and every focused unit file.
- Visual inspection of [Growth on desktop](annotation-growth-desktop.png), [Resistance on a phone](annotation-resistance-phone.png), and [Growth at enlarged layout](annotation-zoom.png). Browser checks also cover 320-pixel layouts, keyboard input, 2×/4× CSS zoom, and literal learner markup.

New regression coverage checks exact raw-state changes, immutable inputs, retained overflow and citations, JSON reloads, malformed and duplicate IDs, stale owner/selection/tab races, focused typing, deferred focus, and live Resistance playback. Retained suites cover portfolios, experiment design, microscopy, Growth citations, evidence review and recovery, Mystery, Gram, maps, quizzes, and workspace navigation.

Earlier attempt reports are retained. The initial mounted annotation check counted a JSDOM selection-event timer as a simulation timer; its replacement verifies the actual 600 ms playback timer and exact round advancement. The first consolidated unit run had two legacy assertions that expected native selection to normalize imported records. Those assertions now verify raw preservation and keep separate checks for explicit repair behavior. Product source did not change during those test corrections. The full unit suite was rerun after the corrections.

## Reproduce

From the repository root:

```powershell
node reports/micro-lab-annotation-integrity-2026-10-01/run-validation.cjs unit
node reports/micro-lab-annotation-integrity-2026-10-01/run-validation.cjs browser
node reports/micro-lab-annotation-integrity-2026-10-01/summarize-validation.cjs 723 49
```

The focused commit helper stages the two runtime files, seven changed test files, this report's top-level artifacts, and only the Micro Lab namespaces in the shared translation registries. It preserves unrelated working changes and staging, runs the installed pre-commit hook, and seals validated inputs before publishing the local commit. Private drafts, browser traces, and commit receipts are excluded.
