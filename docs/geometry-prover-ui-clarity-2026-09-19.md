# Geometry Prover UI clarity — September 19, 2026

## Changes

The Build activity now separates controls into three visible, semantically labeled groups: Start a construction, Edit drawing, and Proof guidance. Native fieldsets and legends expose the same grouping to assistive technology. Spacing separates the groups, and their buttons wrap with a 44-pixel minimum height.

Activity labels are now Build & prove, Guided discoveries, and Practice challenges. Construction labels clarify Blank drawing and Right triangle. Undo last point and Clear drawing describe the existing editing actions. Predict before revealing theorems explains the existing investigation toggle while retaining its pressed state and explanatory text.

Construction preset buttons now expose the selected preset through aria-pressed. All six presets, three activities, drawing operations, guided proofs, missions, and challenges remain available. Existing event handlers, mathematics, saved-state keys, and keyboard navigation are preserved.

## Validation

- 79 tests passed across the shared geometry/data tab-semantics suite and the shared-file geography quiz suite. The broader suite exposed an outdated Probability fixture from the earlier compact-picker change; it now explicitly requests all experiments when asserting 13 visible buttons.
- Browser checks covered all three activities and six presets in default, dark, and high-contrast themes.
- Verified Home, End, and ArrowRight focus after the tool's deferred focus update. Verified selection state for every preset, keyboard operation of proof guidance, unchanged points/segments when toggling guidance, removal of the last point, and clearing the drawing.
- Checked navigation and all three control groups at 1120, 375, and 320 pixels. Controls wrap without overflowing and have minimum heights of 44 pixels. Increased navigation text spacing fits. No browser runtime errors occurred.
- Narrow-screen default and high-contrast control groups were visually inspected.
- Source/public tool and catalog mirrors match, the catalog parses, and scoped diff whitespace checks pass.

Evidence and the reusable component browser harness are in scratch/geometry-prover-ui-2026-09-19/. Browser verification uses mocked host context, not a full deployed app session. Changes remain local; no deployment was made.
