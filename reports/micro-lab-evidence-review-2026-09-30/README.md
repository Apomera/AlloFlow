# Micro Lab evidence review and sweep history

September 30, 2026

## Changes

- **Microscope draft review:** saved drafts explain numeric conversion and viewing limitations without checking accuracy. Review distinguishes features that are unresolved, cropped, too small, or suitable in saved views. Historical focus remains unknown.
- **Previous microscope views:** replay the previous check's calibration with focus assist while preserving both checks and the working draft. Reviewing saved evidence survives tab changes and JSON reload. Return to observation resumes normal progress tracking.
- **Growth sweep history:** retain one previous distinct sweep, inspect its full curve and table, swap saved versions, and export both in the text notebook. Equivalent reruns preserve meaningful history. Restoration keeps trial evidence, predictions, hypotheses, and current setup intact.
- **Download feedback:** Mystery failures can be retried with local feedback. Gram and Quiz feedback clears after evidence changes, including edits that are later reversed. Repeated downloads announce fresh status messages.
- **Keyboard focus:** Home activity shortcuts respect later focus changes and disclosure choices. Growth restoration and explanation shortcuts also respect later focus on activity tabs and the library control.

## Validation

| Check | Result |
| --- | --- |
| Focused unit regressions | 474 passed across 13 files; 73 added this round |
| Chromium scenarios | 30 passed; six new and 24 retained; no retries, skips, or page errors |
| Translation audit | 1,687 extracted keys; no missing keys or changed established fallbacks |
| Runtime copies | Canonical and desktop source match byte for byte |
| Phone review | Draft review, previous-view guidance, full previous sweep, and download retry inspected at 320 px; no page overflow |

Final results are recorded in [validation-summary.json](validation-summary.json), [unit-results.json](unit-results.json), [browser-results.json](browser-results.json), and [translation-audit.json](translation-audit.json).

The first unit attempt passed 473 checks and exposed a new test comparing a sparse fixture with standard tool defaults added during initialization. The comparison now checks all supplied independent fields and the complete normalized notebook. The second attempt passed that test but hit the existing mounted Resistance suite's 20-second limit in its Play/Step case. That suite now uses the focused run's bounded 60-second limit; its behavioral assertions are unchanged. The final complete unit run passed. Both earlier reports are retained as [initial results](unit-initial-results.json) and [recovery results](unit-recovery-results.json).

The browser checks serve the local working tree. They cover draft conversion and viewing blockers, saved-view replay across tabs and JSON reload, explicit return to observation, complete sweep preview and restoration, equivalent reruns, text exports, download failure and retry, later keyboard focus, and retained recovery and reflection workflows. Unit regressions also cover malformed imports, calibration bounds, one-time observation awards, evidence immutability, and interrupted focus requests.

## Evidence

- [Draft review](microscope-draft-review-phone.png) and [saved-view replay](microscope-previous-view-phone.png).
- [Previous sweep](growth-previous-sweep-phone.png) and [both exported sweeps](growth-current-and-previous-sweeps.txt).
- [Download retry](mystery-download-retry-phone.png) and [retried evidence export](mystery-retry-evidence.txt).

## Limits

The microscope models calibrated teaching drawings. Draft review does not grade an estimate or confirm live focus. Replaying previous views uses focus assist; that focus setting does not reconstruct historical focus.

Growth retains one previous sweep. A distinct new sweep replaces that slot. Changing only the starting value of the swept variable does not change the curve or replace history. Trial CSV exports retain their existing schema; the text notebook includes both sweeps.

The scoped commit helper preserves unrelated working changes and staging. Validation serves the local working tree. Remote publication is outside this change.
