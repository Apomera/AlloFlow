# Micro Lab selected activity portfolios

October 1, 2026

## Changes

Home can download a chosen set of activities as a separate evidence portfolio. The included-activities list makes the scope visible before downloading. The full portfolio and one-activity preview remain available.

Each chosen activity keeps its complete recognized evidence: original records, previous versions, recoverable records, working notes, and Growth model-hour citations. Selection filters activities only. It does not change investigation data, learner writing, scores, or XP.

Choices start empty, stay local while Home is open, and reset after leaving or reloading Home. Activities with no evidence or notes are unavailable. Include-all and clear controls support larger reports. Download feedback is scoped to the current content and selection, repeats for later attempts, and allows retry after failures.

## Validation

Final results are recorded in [validation-summary.json](validation-summary.json), [unit-results.json](unit-results.json), [browser-results.json](browser-results.json), and [translation-audit.json](translation-audit.json).

- **631 unit checks across 19 files passed**, including 44 new pure-helper and mounted workflow checks.
- **42 Chromium scenarios passed**: six new selected-portfolio scenarios and 36 retained portfolio, Growth citation, experiment-design, evidence review, recovery, and navigation scenarios. No skips, retries, or page errors.
- **1,879 interface labels** are registered in both runtimes, including ten added here. No missing labels or fallback mismatches were found.
- Runtime mirrors and Micro Lab translation namespaces match; syntax and scoped whitespace checks pass.

The initial focused runs passed all [44 new unit checks](unit-initial-results.json) and [six new browser scenarios](browser-initial-results.json). Those reports are retained alongside the consolidated final runs.

All three screenshots were visually reviewed. Browser checks cover native checkbox keyboard actions, clear included-activity scope, separate full and selected downloads, object-URL and anchor failure/retry, repeated and stale feedback, resource cleanup, content availability changes, literal learner text, disclosure boundaries for unfinished work, and exact preservation of saved state, XP and random draws.

## Evidence

- [Desktop selection](selected-portfolio-desktop.png).
- [Phone layout](selected-portfolio-phone.png) and [enlarged layout](selected-portfolio-zoom.png).
- [Selected activity TXT](selected-portfolio.txt) and [full portfolio TXT](full-portfolio.txt).

## Commit scope

The user authorized a focused combined Micro Lab commit. It includes this pass and the preceding [experiment-design](../micro-lab-experiment-design-2026-10-01/README.md), [portfolio](../micro-lab-portfolio-2026-10-01/README.md), and [Growth citation](../micro-lab-growth-citations-2026-10-01/README.md) passes. Their historical validation summaries retain the hashes of the source validated at those times.

The scoped commit helper includes Micro Lab runtime files, tests, report artifacts, and only the Micro Lab namespace in shared translation registries. It preserves unrelated working-tree changes and staged content. The local commit receipt records publication and index refresh.

## Limits

The download is a readable teaching record. It is not an importable backup, a mastery score, or a biological measurement report. Selecting an activity includes all of its recognized records and drafts. The checkboxes do not select individual records.

Browser checks use the local working tree, native keyboard actions, a 320-pixel phone viewport, and CSS zoom at 2× and 4×. Visual review covers the screenshots above.
