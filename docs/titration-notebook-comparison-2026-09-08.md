# Titration notebook comparison — September 8, 2026

The notebook now shows selected A/B readings on a diagram that zooms to their volume and response ranges. A is a cyan circle and B is a gold diamond, with letter labels and a complete accessible description. Dashed horizontal and vertical guides expose the two differences. The axes describe the selected saved records, including when the live experiment has moved to a different setup.

The average response change per mL uses the rounded differences displayed in the notebook. It retains millivolt precision for redox. Repeated records at the same volume remain comparable, but show an explanation instead of a rate. Coincident points use concentric circle/diamond markers. Swapping A and B reverses the differences and marker roles while retaining the same average slope.

Comparison now requires matching preset, reagent setup, and signal type. Non-finite differences cannot generate a diagram. Student notes, CSV exports, and the underlying chemistry model retain their existing behavior.

On desktop, the dispenser and saved notebook occupy the left column and the comparison stays alongside them. At 760 pixels and below, the panels stack in DOM order. Diagram labels enlarge on narrow screens, and the full selected reagent setup remains visible below the native selectors.

Source/public copies are kept identical. New English strings are registered in the titration catalog; translations remain follow-up work. No packages or assets were added.

Evidence is saved under `reports/chemistry-refinement-2026-09-06/titration-comparison-*`.
## Validation

- 81 targeted tests passed: 55 immersive/measurement tests, 15 motion/persistence tests, and 11 internationalization checks. Seven new tests cover comparison framing, rounded averages, voltage precision, coincident readings, zero response change, incompatible reagent setups, and non-finite differences.
- Real Chromium checks passed for saved observations, keyboard swapping, same-volume readings, selection changes, preserved experiment state, notes, CSV export, redox units, changing the live setup/view, incompatible comparisons, clearing the notebook, and clean unmount.
- All 16 final WCAG axe scans passed across acid/base, redox, same-volume, and incompatible states at 1200, 760, 360, and 320 pixel widths. No horizontal overflow or page errors were observed.
- Final desktop workspace, mobile comparison, and redox screenshots were visually inspected. Syntax, scoped whitespace checks, and source/public byte parity passed.

The browser harness uses the real widget and application styles in a local fixture. This is component-level validation, not a deployed-platform or physical-device audit. No deployment was performed.
