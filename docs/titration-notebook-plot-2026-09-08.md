# Titration notebook plot — September 8, 2026

The Reading notebook now offers **Plot readings** after an observation has been saved. It opens a full-width plot above the bench tools with saved observations on the left and a selected-reading panel on the right. The panels stack on narrow screens, with larger chart text and the complete reagent setup below the selector.

The chart shows saved points without fitting a titration curve between them. Axes frame the saved values. The selected observation has a gold ring, horizontal/vertical guides, numerical readouts, indicator status, and any student note. Mouse or touch selection chooses the nearest point in the plot area. Native reading selectors and Previous/Next controls provide keyboard access and make overlapping readings independently selectable.

Groups require the same preset, reagent setup, and signal type. Redox groups retain potential in volts, including millivolt precision. Different groups never share a plot. New saves and live experiment changes preserve the selected saved reading. Use as A and Use as B send it to the existing comparison controls. Selecting a point does not dispense titrant, alter recorded values, edit notes, or recreate the 3D viewer.

Opening the plot focuses the reading selector. Escape and Close plot return focus to Plot readings. Clearing the notebook closes the plot and disables its toggle until another reading is saved. The plot also works across 2D and 3D view switches.

No new dependencies, timers, or renderers were added. Source/public copies are identical. New English strings are registered in the titration catalog; translations remain follow-up work.

## Validation

- 92 targeted tests passed: 66 immersive/measurement tests, 15 motion/persistence tests, and 11 internationalization checks. Seven new tests cover setup grouping, selection recovery, plot bounds, single/coincident readings, redox precision, invalid ranges, and nearest-point selection.
- Real Chromium checks passed for mouse selection, native keyboard navigation, overlapping readings, note display, A/B handoff, stable selection after new saves, experiment/view changes, redox values, Escape/close focus, CSV preservation, notebook clearing, and clean unmount. No page errors were observed.
- Touch taps selected points at 320 pixels. Native controls remained operable with forced colors and reduced motion enabled.
- All 16 WCAG axe scans passed across acid/base, overlap, redox, and single-reading states at 1200, 760, 360, and 320 pixel widths, with no horizontal overflow.
- Desktop, mobile, and redox screenshots were visually reviewed. Syntax, source/public parity, English fallback matching, and scoped whitespace checks passed.

The browser harness uses the actual widget, React, Three.js, and application styles in a local fixture. These are component-level checks, not a deployed-platform, full accessibility, or physical-device audit. No deployment was performed.

## Evidence

Run `node reports/chemistry-refinement-2026-09-06/titration-notebook-plot-browser.cjs` to repeat browser checks. The same directory contains `titration-notebook-plot-browser-results.json`, `titration-notebook-plot-tests.json`, and desktop/mobile/redox JPEG screenshots.
