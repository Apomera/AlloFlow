# Basic math: construction and connected representations

This third implementation pass follows the complete basic-math review and the first two refinement passes. It adds learner-controlled investigation to Area Model, Area & Perimeter, and Time & Schedule, and resolves a Unit Converter contrast finding reported in the shared handoff.

## What changed

- **Area Model:** a proportional tens-and-ones rectangle connects to selectable partial products in the table and addition equation. Selecting either representation highlights the matching region and provides a live explanation. Zero products explain why there is no region. Unsolved challenges continue to withhold partial answers. The model scales to the available space; table factors now use row headers.
- **Area & Perimeter:** learners build rectangles for a target area and save valid constructions. Feedback distinguishes too few squares, too many squares, and a duplicate rectangle—including rotations. Collections persist separately for each target. Saved miniatures share a consistent scale, allowing direct comparison of equal areas and different boundaries. Complete factor pairs and the minimum-perimeter explanation are available in a closed disclosure. Boundary tracing now reports the side lengths and running distance, identifies perimeter on the fourth edge, and offers an explicit restart.
- **Time & Schedule:** an optional prediction mode accepts a predicted endpoint and reveals one friendly jump at a time. The timeline, text alternative, and endpoint card reveal only the steps reached. Prediction feedback appears after the final jump; changed inputs reset progress. Forward, backward, midnight-crossing, and zero-duration cases are handled. The timeline scrolls at a readable size on phones and uses a white diagram surface so labels remain legible in dark and high-contrast themes.
- **Theme refinements:** corrected the Unit Converter high-contrast figure caption and dark-mode value/unit fields. Full application-theme verification also identified and corrected Area Model factor-field and table-heading contrast issues.

New learner-facing copy is registered in the English string registry. The four source modules and their desktop public mirrors are synchronized. New translations were not authored.

## Validation

- 14 new behavioral checks cover proportional regions, linked selections, hidden challenge answers, zero products, construction feedback and duplicate rotations, target-specific collections, equal-scale saved shapes, boundary tracing, jump progression, prediction feedback, and midnight/zero-duration cases.
- The complete focused regression run passed **75 tests** across seven suites. Results: `scratch/basic-math-pass3/final-tests.json`. A final post-theme regression run passed another 41 focused checks (`post-theme-tests.json`).
- Audited **21 activity/theme states** at desktop and phone sizes, with WCAG A/AA and 320-pixel page-reflow checks; all passed after visual refinements. Screenshots were reviewed directly, including cases where automated contrast checks did not identify unreadable SVG labels.
- Added **12 checks using the full application stylesheet**. These exposed the field/heading contrast issues described above. The six affected tool/theme states passed rechecks after correction; detailed results are in `scratch/basic-math-pass3/theme-recheck-results.json`.
- Evidence, before-pass source snapshots, and reproducible browser scripts are under `scratch/basic-math-pass3/`. The checks are focused component/browser fixtures; they do not constitute a production deployment or a new audit of every application workflow.

No broad build, staging, commit, or deployment was performed. Unrelated concurrent workspace edits were preserved.
