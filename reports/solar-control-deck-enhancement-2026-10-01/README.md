# Solar System controls and guided missions — October 1, 2026

This pass improves the Full Orrery's playback controls, orbit landmarks, map display options, and guided missions. All changes remain uncommitted.

## Changes

- Playback now has a clear Orbit clock heading, a larger play/pause action, a full-width simulation-speed slider, and a readable live explanation of orbit duration.
- Orbit phase inspection has its own panel and full-width slider. Five larger landmark buttons retain the original phase values, keyboard behavior, and distinct start/next-perihelion states. A small segmented indicator follows the shared clock.
- Corrected the invalid Chromium slider-track selector and added visible, contrasting rails in both themes. Firefox rails use the same palette.
- Map display options group marker sizes, map views, and layers. The reset label now says “Reset orbit time,” with text explaining its effect on time, camera, and selected worlds. Saved evidence remains intact.
- Guided missions use a named section and real heading, a three-step roadmap, readable theme colors, and distinct incorrect/completed feedback surfaces. World colors appear on borders. Actions have 44px minimum target heights.

Visible speed/reset wording matches the existing accessible names, following [W3C label-in-name guidance](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html). The reset explanation still describes its camera and selection effects.

The existing clock, physics, camera/filter callbacks, paused prediction gates, mission progress, and evidence data contracts are preserved. The canonical source and desktop mirror receive the same changes.

## Before and after

| Area | Baseline | Enhanced |
| --- | --- | --- |
| Phone light controls | [Before](before-mercury-320-light-controls.png) | [After](after-mercury-320-light-controls.png) |
| Phone light mission | [Before](before-mercury-320-light-mission.png) | [After](after-mercury-320-light-mission.png) |
| Phone light display options | [Before](before-mercury-320-light-display.png) | [After](after-mercury-320-light-display.png) |
| Desktop dark controls | [Before](before-mercury-1060-dark-controls.png) | [After](after-mercury-1060-dark-controls.png) |
| Desktop dark mission | [Before](before-mercury-1060-dark-mission.png) | [After](after-mercury-1060-dark-mission.png) |
| Desktop dark display options | [Before](before-mercury-1060-dark-display.png) | [After](after-mercury-1060-dark-display.png) |

## Verification

All **79 distinct focused unit checks** passed across the full run and final targeted rerun. The full run passed 77 checks; two expectations for old visible labels were aligned with the new headings. The final rerun passed all three affected checks, including the reset label. Coverage includes clock lifecycle, timeline state, control names, canvas alternatives, theme safety, phone layouts, and source parity. Evidence: [full unit JSON](final-unit-tests.json), [final label-check JSON](final-label-unit-tests.json), and [final label-check log](final-label-unit-tests.log).

All **20 distinct targeted Chromium browser cases** passed across the main run and focused rerun, with one worker and retries disabled. The main run passed 15 cases. The four new cases initially used an incorrect snapshot-button selector, which was corrected to the existing accessible name; an existing desktop case hit a context-teardown timeout. All five affected cases passed in the final rerun. Evidence: [main browser log](browser-tests.log), [final browser log](final-browser-tests.log), and [final browser artifacts](final-browser-results/).

The new browser regression file covers phone/desktop layouts in both themes, target sizes, composited text contrast, all five landmarks, keyboard sliders, live node retention, native disclosure persistence, reset preserving captured evidence, and the Mercury wrong/correct/next-mission workflow. Existing browser cases cover live clock behavior, camera presets, layer visibility, paused predictions, and world detail/evidence accessibility.

The final visual review passed all five cases, with no page overflow or browser runtime errors. Screenshots confirm visible slider rails. The measured minimum target height is 44px in every case.

| Width | Theme | World | Minimum target height | Minimum control/mission text contrast | Completed mission contrast |
| --- | --- | --- | --- | --- | --- |
| 1060px | Dark | Mercury | 44px | 8.96:1 | 8.96:1 |
| 1060px | Light | Mercury | 44px | 7.24:1 | 6.81:1 |
| 736px | Dark | Earth | 44px | 8.96:1 | 8.96:1 |
| 320px | Light | Mercury | 44px | 7.24:1 | 6.38:1 |
| 320px | Dark | Mars | 44px | 8.96:1 | 8.96:1 |

Contrast measurements composite transparent backgrounds over their parent surfaces. The browser tests also cover incorrect prediction feedback and active control states. Evidence: [final metrics](after-metrics.json), [visual log](after-visual-qa.log), [desktop completed mission](after-mercury-1060-dark-completed-mission.png), and [phone completed mission](after-mercury-320-light-completed-mission.png).

The local Windows verification environment was slow enough to exceed default worker-start and test deadlines. A report-local loader extends Vitest startup deadlines; final unit checks used a 60-second test/hook deadline. The isolated browser rerun disables video/trace recording to avoid slow artifact flushing. These runner accommodations are confined to the report directory and command-line options.

JavaScript syntax, scoped whitespace checks, and matching SHA-256 hashes for canonical/desktop sources passed. All changes remain uncommitted.

Reproduce visual checks from the repository root:

```powershell
node reports/solar-control-deck-enhancement-2026-10-01/visual-qa.cjs
```

The saved baseline is historical evidence; do not rerun with `--before` after editing the source. No commit was created.
