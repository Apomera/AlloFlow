# Micro Lab evidence portfolio

October 1, 2026

## Changes

Home now offers one place to review evidence and working notes from all six investigations and download a combined text record. Records retain explicit labels for saved evidence, earlier versions, recoverable records, and working drafts.

Home also reflows within its available width: padding is included in its width, and activity cards adapt to narrower space at enlarged zoom.

The portfolio is a read-only projection. Reviewing, choosing an activity, and downloading leave saved work, observations, progress, and XP unchanged. Quiz solutions and results remain hidden before valid submission. Pending measurements and Growth setups keep their learning boundaries.

## Validation

| Check | Final result |
| --- | --- |
| Unit regressions | 540 passed across 15 files; 39 new portfolio checks |
| Chromium scenarios | 29 passed: 6 new and 23 retained; no retries, skips, or page errors |
| Interface strings | 1,837 keys audited; 121 new labels; no missing keys or changed established fallbacks |
| Runtime and strings | Canonical source and desktop mirror match; Micro Lab translation namespaces match |
| Layout and interaction | Native disclosure and selection controls, 44-pixel controls, 320-pixel phone layout, and internal reflow at 2× and 4× CSS zoom |

Final results are recorded in [validation-summary.json](validation-summary.json), [unit-results.json](unit-results.json), [browser-results.json](browser-results.json), and [translation-audit.json](translation-audit.json). The source hash identifies the validated runtime. All three screenshots below were reviewed after the final browser run.

### Earlier validation attempts

- [Initial new unit checks](unit-initial-results.json): 36 passed and 3 failed. Two text assertions were too broad: a future-round check matched the end of a cell count, and a private-field check matched legitimate biological prose. They now use exact boundaries and a distinct sentinel. The navigation fixture also needed eight existing render defaults. Exact saved-state, RNG, and Date checks remain in place. The final complete run passed all 540 checks.
- [Initial browser checks](browser-initial-results.json): 5 passed and 1 failed. An internal overflow check exposed Home padding extending beyond the phone width; a [targeted diagnosis](browser-layout-results.json) confirmed it. After that fix, the [enlarged-layout check](browser-recovery-results.json) exposed fixed card columns becoming too narrow at 4× zoom. Cards now adapt to the available width. The final run passed all 29 scenarios, including all six portfolio checks.

The retained browser scenarios cover prior evidence review, calibrated measurement replay, recoverable records, guided navigation, Growth design preparation, and Resistance readability.

## Evidence

- [Home portfolio](portfolio-home-desktop.png).
- [Phone review](portfolio-home-phone.png).
- [Enlarged preview](portfolio-preview-zoom.png).

## Limits

This is a readable record of the teaching activities, not an importable backup. The download preserves recognized evidence and learner notes; arbitrary unknown state fields are not serialized. Earlier versions and recoverable records reflect what the lab currently retains.

Portfolio labels use the interface string registry. Supplied Mystery observation text and the reused Quiz and Resistance text formats keep stable English content.

The changes build on the [experiment-design and reading-comfort pass](../micro-lab-experiment-design-2026-10-01/README.md), which passed 501 unit checks and 36 browser scenarios. Enlarged-layout checks use CSS zoom at 2× and 4×.

These changes were left uncommitted at the end of this pass. The later [selected-portfolio pass](../micro-lab-selected-portfolio-2026-10-01/README.md) records their combined commit status.
