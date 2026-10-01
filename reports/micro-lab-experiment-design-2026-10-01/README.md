# Micro Lab experiment design and reading comfort

October 1, 2026

## Changes

- **Planned Growth settings:** compare the saved control and proposed trial before running. The preview identifies missing controls, unchanged settings, one difference, or multiple differences. It shows all four settings and which are held constant. It computes no populations, rates, outcomes, or prediction scores.
- **Optional preparation:** keep one chosen difference and restore the other settings from the control. This changes the working setup while preserving the control, recorded trials, removal recovery, sweeps, selected evidence, predictions, reasoning, and other notes. Unchanged and multiple-difference comparisons remain available to explore.
- **Profile comparisons:** the guidance distinguishes changing the organism profile from changing environmental settings. It describes comparisons within the teaching model.
- **Resistance reading comfort:** larger body text, headings, and controls; wrapping grids and tables; readable HTML chart-axis labels; and clear circle/diamond legends. Contextual explanations define resistant share, relative exposure strength, exposure rounds, and starting resistance, with accessible descriptions linked to the existing controls.
- **Keyboard navigation:** preparation moves focus to its stable heading and respects later focus changes, edits, navigation, and remounts.

## Validation

| Check | Final result |
| --- | --- |
| Unit regressions | 501 passed across 13 files; 27 checks added this round |
| Chromium scenarios | 36 passed: 6 new and 30 retained; no retries, skips, or page errors |
| Interface strings | 1,716 keys audited; no missing keys or changed established fallbacks |
| Runtime and strings | Canonical source and desktop mirror match; Micro Lab translation namespaces match |
| Layout and interaction | 320-pixel phone layouts, native keyboard interactions, and internal panel reflow at 2× and 4× CSS zoom |

Final results are recorded in [validation-summary.json](validation-summary.json), [unit-results.json](unit-results.json), [browser-results.json](browser-results.json), and [translation-audit.json](translation-audit.json). The source hash in the summary identifies the validated runtime.

### Earlier validation attempts

- [Initial unit run](unit-initial-results.json): 496 passed, 5 failed. An existing table assertion needed to target the saved result after the planned-settings table was added. Four new preservation fixtures needed to include established render defaults. The corrected checks still compare the complete saved state.
- [Second unit run](unit-recovery-results.json): 499 passed, 2 failed because existing Home tests exceeded their time limits on this host. The existing Home suite and cleanup limits were raised to 60 seconds. Behavioral assertions stayed unchanged. The final run passed all 501 checks.
- [Initial browser run](browser-initial-results.json): 33 passed, 3 failed. Two new preservation fixtures omitted established legacy defaults, and a new reflection assertion used the wrong selector. Corrected fixtures include a valid saved Resistance round and its notes. The [focused recovery run](browser-recovery-results.json) passed all 6 new scenarios; the final run passed all 36 scenarios against the finished source.

All four screenshots below were reviewed after the final browser run. The planned-settings table deliberately scrolls sideways on narrow screens and includes a visible scrolling cue.

## Evidence

- [Planned settings](growth-design-preview-phone.png) and [prepared comparison](growth-design-repair-phone.png).
- [Readable Resistance panel](resistance-readable-phone.png) and [enlarged layout](resistance-readable-zoom.png).

## Limits

The preview compares normalized teaching-model settings. It helps identify differences; it does not establish causation in a biological sample. Changing the organism profile keeps the other modeled settings fixed when that is the chosen difference.

Preparation is optional and preserves the current prediction and reasoning so the learner can revise them deliberately. The prepared setup is saved with a trial when the learner runs the comparison.

Browser coverage verifies accessible names and descriptions, native keyboard interactions, phone layouts, and internal panel reflow. Enlarged-layout checks use CSS zoom at 2× and 4×.

Validation serves the local working tree. These changes were left uncommitted at the end of this pass. The later [selected-portfolio pass](../micro-lab-selected-portfolio-2026-10-01/README.md) records their combined commit status.
