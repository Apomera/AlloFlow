# Micro Lab: Mystery notes and report integrity

October 2, 2026

## Changes

Mystery Lab now updates the latest raw notebook instead of saving its normalized display projection. Switching cases or report views, revealing observations, editing notes, checking evidence, recording, and restoring reports preserve imported metadata and untouched notes.

- Case navigation changes only the active case and notice. Report navigation additionally changes the selected report view.
- Edits update only the intended fields in the selected case. Unknown cases, other activities, and unrelated tool data remain intact.
- Recording keeps the exact replaced raw report as previous history. Restoring swaps the two raw report objects, including their imported metadata.
- Queued actions reject changed tabs, active cases, replaced/imported source cases, and changed draft or report fields. Updates to unrelated cases and metadata are retained.
- Deferred heading focus requires a successfully applied transition that still owns the current notebook. Repeated React updater computations are supported.
- Container queries adapt the report layout to available panel width, including 400% zoom. Controls and imported text wrap within the panel.

## Limits

The existing 1600-character display and text-export limits remain. Imported working notes retain their full raw text until the learner explicitly changes that field. Newly recorded reports use the visible, bounded draft; replacing a report preserves the full raw old snapshot in history. Display normalization continues to hide unsupported or malformed fields without rewriting them during unrelated actions.

The fictional cases, evidence checks, classification rules, and XP behavior retain their existing semantics.

## Validation

The final consolidated run passed **865 unit checks across 25 files** and **63 Chromium scenarios across 10 specs**, with no failures, skips, flaky scenarios, or retries. This includes 71 new mounted Mystery integrity checks and seven new browser scenarios. Desktop, phone, and 400% zoom screenshots were inspected.

Canonical and desktop runtime SHA-256: `5c4f2d3d83294a551a1ba822b9c74b5fb744005b8b6217e2a2590a56b6891a0b`.

The source candidate is recorded in `candidate.json`. Final receipts, all 35 tested input hashes, label parity, and consolidated counts are recorded in `validation-summary.json`. All 1895 source-used Micro Lab labels have matching fallbacks and the two runtime files match byte for byte.

New regressions cover exact field changes, long imported notes, unknown metadata and cases, frozen imports, JSON reloads, current and previous raw reports, stale functional updates, keyboard focus, phone width, and enlarged layouts. Existing Micro Lab unit and Chromium scenarios run alongside them.

Earlier diagnostics are retained. The initial browser preflight caught a temporary desktop-mirror mismatch before executing any tests. The first focused browser run passed six of seven scenarios and found a 400% zoom overflow. Visual review then found narrow columns despite an overflow check passing; the container rule was corrected and the test now requires one full-width report column. The earlier full browser run was stopped for that refinement. The final run passes on the refined source.

An earlier focused unit attempt failed to start its worker and executed no tests; its preceding run passed 123 checks before the final StrictMode case was added. Source preflight checks also stopped runs with an outdated helper hash before any tests executed. A later browser layout worker exhausted memory during startup; its diagnostics were kept and the unchanged candidate passed when rerun after the unit suite finished.

## Reproduce

Run from the repository root:

```powershell
node reports/micro-lab-mystery-integrity-2026-10-02/run-validation.cjs unit
node reports/micro-lab-mystery-integrity-2026-10-02/run-validation.cjs browser
node reports/micro-lab-mystery-integrity-2026-10-02/summarize-validation.cjs 865 63
```

The runners verify canonical and desktop source hashes and every selected test input before and after execution. Chromium uses one worker and zero retries. The summary rejects missing, failed, skipped, or flaky checks and verifies runtime, syntax, and Micro Lab translation parity.

## Commit scope

The isolated commit includes the canonical runtime, desktop mirror, two new regression files, and this pass's validation artifacts. Translation registries are excluded because this change introduces no interface labels. The commit helper runs the installed hook, verifies all sealed inputs, and checks that every unrelated index entry is preserved before publishing the local commit.
