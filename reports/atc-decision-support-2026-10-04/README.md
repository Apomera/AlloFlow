# ATC decision support enhancement

The selected-aircraft panel now helps learners compare the aircraft's current state with its instructions, inspect a draft command, and understand the response immediately after sending it.

## Changes

- A compact readback pairs current heading, altitude, and speed with their instructed targets. Approach and holding guidance are identified explicitly. Frozen automatic targets show “Guided” because guidance recomputes when traffic moves; manual targets stay visible while paused.
- Heading entry includes a compass, shortest-turn direction, cardinal presets, and the consequences of cancelling approach guidance or releasing a teaching hold. Speed entry includes presets and a direct constant-speed arrival comparison, with its assumptions stated and estimates deferred during holds and go-arounds.
- Drafts freeze traffic and leave aircraft instructions unchanged until Send. Aircraft selection stays on the intended recipient while the form is open. Cancel and Escape retain existing instructions and return focus to the command button.
- Sent, blocked, and unchanged commands show local feedback. Repeated clearances, unchanged runway assignments, and repeated go-arounds explain their existing state without adding another decision or disturbing guidance.
- Contextual coaching sits beside the commands. Phone navigation buttons move focus between the radar and selected-aircraft controls, reducing the need to repeatedly scroll through flight strips.
- Debrief evidence can be filtered to instructions, outcomes and alerts, or math decisions. Go-arounds appear in both recovery-relevant views. Events keep their recorded order and timestamps, and each new debrief starts on All events. Filtering leaves saved evidence, scores, and reflection notes intact.

## Verification

The automated suite passes **165 checks across 17 files**, including 16 new tests for readbacks and immutable previews. The new cases cover north wrapping, the 180-degree turn tie, valid zero headings, invalid inputs, approach and hold consequences, direct speed comparisons, missing geometry, deferred estimates, and mutation protection.

JavaScript parsing, canonical/public tool equality, and all three ATC English catalogs pass. The English catalogs contain **442 keys**. `verification.json` records the exact verified source hash.

**89 browser checks pass**: 18 focused decision-support checks and 71 regression checks. Installed Chrome verified real final-approach behavior, immutability while previewing, instruction feedback, keyboard focus, mobile navigation, evidence filtering, 320/390/1440 px layouts, 200% zoom, forced colors, and reduced motion. No browser runtime errors or serious/critical axe issues were found in the checked views. Phone viewport checks do not emulate a device's on-screen keyboard.

Final browser findings and screenshots are documented in `VISUAL-AUDIT.md` and `browser-qa-results.json`. Regression browser results from the preceding passes are retained alongside them.

## Artifacts

- `VISUAL-AUDIT.md`: baseline findings and final visual review.
- `baseline-metrics.json`: original current-state omissions, control positions, and button sizes.
- `browser-qa-results.json`: the focused decision-support browser checks.
- `baseline-browser-results.json`, `practice-browser-results.json`, and `visual-regression-results.json`: the 71 regression checks.
- `verification.json`: source syntax, mirrors, English catalogs, and hash.
- `before-controls-*`, `before-heading-*`, and `before-playing-*`: baseline screenshots at desktop and phone widths.
- `after-controls-*`, `after-heading-*`, `after-speed-*`, and `after-playing-*`: final screenshots, including the heading form in forced colors at 200% zoom.

## Reproduce

From the repository root:

```powershell
node reports/atc-deep-dive-2026-10-03/run-tests.cjs
node reports/atc-deep-dive-2026-10-03/browser-qa.cjs
node reports/atc-quality-pass3-2026-10-03/browser-qa.cjs
node reports/atc-visual-engagement-2026-10-03/browser-qa.cjs
node reports/atc-decision-support-2026-10-04/browser-qa.cjs
node reports/atc-decision-support-2026-10-04/verify.cjs
```
