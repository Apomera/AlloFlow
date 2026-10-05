# Galaxy: launch controls and saved experiments

Date: 2026-10-01

Black-hole object placement and aiming now have visible handles and a clear Place → Aim → Release workflow. Saved releases, notes, and a fixed comparison path persist in tool data.

## Launch interaction

- Place and Aim sit beside the prediction, with a live readout of radius, angle, sideways speed, and radial push.
- A 48 px handle marks the release position or velocity tip. It supports mouse, touch, arrow keys, and Escape cancellation.
- Editing frames the placement area and velocity handle. Returning to camera mode restores the previous view; framing stays fixed during a drag.
- Playback and timeline controls sit above saved history. Phone controls retain 44 px targets.

## Saved experiments

- Save up to eight releases with a note. Saved settings are independent of subsequent edits.
- Compare any saved release with the current launch. Its purple reference path survives mode changes and reopening.
- Restore returns to the saved inputs and pauses at the release, including when those inputs already match the current run.
- Remove has Undo. The capacity limit preserves existing entries and notes.
- Export downloads JSON containing saved settings, notes, the kept reference, and predictions recomputed by the current model.
- Tool persistence stores validated scalar inputs. Scene objects, trajectories, and geometry are rebuilt rather than stored.
- Notebook history is collapsible and scrolls within a bounded area, with two columns on desktop and one on phones.

## Verification

- 501 tests passed across all 18 Galaxy suites.
- The new browser check passed native mouse/touch interaction, keyboard adjustment, cancellation, notes, restoration, complete JSON unmount/remount, comparison persistence, Undo, capacity, export, and scene cleanup.
- Existing planning, debris picking, motion, and optical browser regressions passed with no browser errors.
- Desktop at 1440 px, phones at 390 and 320 px, and RTL layouts passed target-size and horizontal-overflow checks. Screenshots were visually reviewed.
- Both Galaxy source files match byte for byte. Source and new scripts passed syntax checks; the scoped diff passed whitespace checks.
- 38 English Galaxy labels match both UI registries and the English catalog. New labels use the existing translation fallback.

## Model scope

This pass uses the existing nonrotating Schwarzschild center-path model. Saved outcomes are labelled as center-path predictions. Tidal deformation remains illustrative, and individual debris paths can differ from the center path.

## Evidence and preview

- [Validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-notebook-2026-10-01/validation-summary.json)
- [Full test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-notebook-2026-10-01/galaxy-tests.json)
- [Notebook browser checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-notebook-2026-10-01/browser-results.json)
- [Desktop screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-notebook-2026-10-01/launch-and-notebook-1440.png)
- [320 px screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-notebook-2026-10-01/launch-and-notebook-320.png)
- [RTL screenshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-notebook-2026-10-01/notebook-320-rtl.png)
- [Local preview](http://127.0.0.1:53693/): choose Black holes, then Object experiment.

Changes remain uncommitted.
