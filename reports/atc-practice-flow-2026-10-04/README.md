# ATC practice flow enhancement

This pass makes an exercise easier to understand before launch and aligns the live coaching with its measured objective.

## Changes

- **Preview before starting.** Each pathway card has a collapsed Preview exercise disclosure containing the canonical airport, briefing, and starting traffic: callsign, type, altitude, speed, heading, runway, and declared priority. Previews do not create a shift, change progress, or reveal the separate solution hint. Exercises still start directly from their existing buttons.
- **Coach the actual task.** Separation practice initially asks for different altitude targets instead of the unrelated runway assignment. It distinguishes an unplanned gap, pending targets, and actual spacing. Arrival exercises identify the expected next aircraft when applicable; current spacing, runway, hold, and recovery concerns retain their guidance. Failed objectives lead to review and retry advice.
- **Show measured progress.** Live separation objectives display the actual altitude gap against 1,000 feet and elapsed shift time against six seconds. A target never counts as achieved spacing. Nonfinite or malformed altitude and time cannot complete the objective, and missing or retired exercise traffic cannot supply measured evidence.
- **Name the destination and pace.** Welcome launch descriptions identify the guided exercise or selected airport and whether the shift begins live or paused. A completed debrief names the next exercise. The descriptions are visibly displayed and associated with their buttons for assistive technology.
- **Keep the flow accessible.** Preview disclosures have native keyboard behavior and at least 44-pixel touch targets. Added traffic rows and measured values fit phone screens and use system colors in forced-colors mode. Existing start, debrief, and retry focus transitions are preserved.

## Verification

The combined automated suite passes **228 tests across 20 files**, including 24 new cases for actual versus pending separation, both-aircraft target changes, finite measured evidence, objective precedence, arrival-order advancement, and unchanged inputs.

JavaScript parsing, canonical/public source equality, and all three English catalogs pass. ATC English catalogs contain **497 keys**. `verification.json` records the final source hash.

All **147 browser checks pass**: 17 focused flow checks and 130 regression checks across the six preceding browser suites. The focused run matches the final source hash and reports zero runtime errors or native dialogs. Findings and screenshots are recorded in `browser-qa-results.json` and `VISUAL-AUDIT.md`. The focused flow uses actual starting traffic, progressive aircraft movement, completion, an arrival landing, a conflict, and retry behavior. Retained regression results cover simulation, commands, recovery, reflections, responsive layouts, and keyboard access.

Browser reviews use installed Chrome at desktop and 390/320-pixel phone viewport widths, including reduced motion and forced colors at 200% zoom. Phone viewports do not emulate a device's on-screen keyboard. Classroom engagement outcomes were not measured.

## Reproduce

From the repository root:

```powershell
node reports/atc-deep-dive-2026-10-03/run-tests.cjs
node reports/atc-deep-dive-2026-10-03/browser-qa.cjs
node reports/atc-quality-pass3-2026-10-03/browser-qa.cjs
node reports/atc-visual-engagement-2026-10-03/browser-qa.cjs
node reports/atc-decision-support-2026-10-04/browser-qa.cjs
node reports/atc-learning-experience-2026-10-04/browser-qa.cjs
node reports/atc-operational-clarity-2026-10-04/browser-qa.cjs
node reports/atc-practice-flow-2026-10-04/browser-qa.cjs
node reports/atc-practice-flow-2026-10-04/verify.cjs
node reports/atc-practice-flow-2026-10-04/collect-regression-results.cjs
```
