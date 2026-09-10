# Sculpt: repeated copies

**Edit → Arrange → Repeat this part** now supports creating multiple evenly spaced copies in one action. The controls specify local axis, direction, center-to-center spacing in displayed units, and the number of additional copies. The count is limited to available capacity within the 14-part sculpture limit.

The full sequence is validated before any geometry changes. If a later copy would leave the workspace, nothing is added and redo remains available. Successful patterns use one undo transaction and select the last copy, making it convenient to continue a row. Copies preserve primitive dimensions, rotation, material, and group, receive distinct identities, and are unlocked. Mirror operations continue to create a single reflected copy independently of repeat count.

The arrangement controls use a compact two-column card with spacing guidance and a remaining-capacity summary. Undo and redo now clear stale operation feedback.

## Verification

- Three focused suites passed **69 tests**: 33 sculpt editor tests, 20 panel tests, and 16 workbench tests.
- After the feedback-clearing refinement, all 33 sculpt editor tests passed again. A transient 5-second timeout in the 14-part rendering test was resolved by an isolated rerun with a 15-second allowance; the full editor suite's test execution then took 3.12 seconds.
- Real browser workflows passed at **1440×1000** and **390×844**, verifying configuration without geometry/history changes, exact copy spacing, unique identities, one-step undo/redo, and refusal of a partially fitting sequence without adding any parts.
- No runtime errors, failed requests, or HTTP errors were reported.
- Desktop repeated-column and phone control screenshots were visually inspected.
- Source/public copies match and scoped whitespace checks passed.

Artifacts: `scratch/geometry-sculpt-repeat-2026-09-08/`.
