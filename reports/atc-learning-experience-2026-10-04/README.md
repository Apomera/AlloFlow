# ATC learning experience enhancement

This pass connects review, reflection, and the next attempt. Learners can revisit the right exercise, distinguish an earlier skill completion from their latest result, and read their own saved note when repeating the same task.

## Changes

- **Review a decision:** reflection appears before shift statistics and the detailed event log. A native selector can bring one recorded moment into view, with short prompts about intention, effect, and the next change. Choosing a moment never changes the learner's saved text or the evidence record. Reflection remains optional.
- **Use a previous reflection:** starting an exercise captures the latest matching attempt's note. Ordinary airport shifts use the latest non-exercise attempt at that airport. Unrelated exercises and older notes behind a newer blank attempt are excluded. The note appears in a closed disclosure beneath the live objectives; dismissing it applies only to this attempt and keeps the original reflection saved.
- **Keep review context through recovery:** captured notes and dismissal state are bounded and included in checkpoints, restoration, and periodic display snapshots. A recovered note does not depend on whether the original debrief is still in the eight-entry history.
- **Recognize the latest outcome:** practice cards show Objectives met, Review needed, or Unfinished for the latest validated result. A later unfinished attempt preserves the earlier Completed skill. Review last attempt opens the actual retained debrief; the button is absent when its full evidence has expired from history.
- **Find prior exercises:** recent history identifies the scenario, outcome, and presence of a saved reflection instead of showing several indistinguishable guided shifts at the same airport.
- **Preserve saved notes:** editing an existing reflection retains the other seven notes. Adding a ninth note keeps the existing eight-note bound. Notes remain limited to 2,000 characters.

## Verification

The combined automated suite passes **184 tests across 18 files**, including 19 new review-continuity cases. These check note validation and context isolation, newest-attempt precedence, bounded text/history, durable outcomes versus retained debriefs, immutability, and checkpoint restoration/dismissal.

JavaScript parsing, canonical/public source equality, and all three ATC English catalogs pass. The catalogs contain **460 keys**. The verified source hash is recorded in `verification.json`.

**108 browser checks pass:** 19 focused learning-experience checks plus 89 regression checks. Installed Chrome verified the actual review/retry flow, saved-note retention, periodic refresh, dismissal and recovery, earlier completion with a later unfinished attempt, history expiry, keyboard access, 320/390/1440 px layouts, and forced colors at 200% zoom. No browser runtime errors or serious/critical axe issues were found in the checked views. The focused suite records a stable source hash matching `verification.json`.

Browser results and visual findings are recorded in `browser-qa-results.json` and `VISUAL-AUDIT.md`. The four regression suites retain 89 checks in this directory. Phone viewport checks use installed desktop Chrome and do not emulate a device's on-screen keyboard; classroom engagement outcomes were not measured.

## Artifacts

- `VISUAL-AUDIT.md`: baseline findings, final review, and observed limitations.
- `baseline-metrics.json`: the original menu, pathway, and debrief layouts.
- `browser-qa-results.json`: focused browser checks for this pass.
- `baseline-browser-results.json`, `practice-browser-results.json`, `visual-regression-results.json`, and `decision-support-regression-results.json`: regression checks.
- `verification.json`: source syntax, mirrors, catalogs, and hash.
- `before-*` and `after-*`: desktop and phone screenshots, including selected evidence, carried reflection, and forced colors at 200% zoom.

## Reproduce

From the repository root:

```powershell
node reports/atc-deep-dive-2026-10-03/run-tests.cjs
node reports/atc-deep-dive-2026-10-03/browser-qa.cjs
node reports/atc-quality-pass3-2026-10-03/browser-qa.cjs
node reports/atc-visual-engagement-2026-10-03/browser-qa.cjs
node reports/atc-decision-support-2026-10-04/browser-qa.cjs
node reports/atc-learning-experience-2026-10-04/browser-qa.cjs
node reports/atc-learning-experience-2026-10-04/collect-regression-results.cjs
node reports/atc-learning-experience-2026-10-04/verify.cjs
```
