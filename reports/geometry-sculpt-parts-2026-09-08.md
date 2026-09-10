# Sculpt: part finding and selection focus

The Parts view now places the existing part list before the add-shape palette. Larger sculptures get a collapsible finder that searches names, primitive types, groups, and original part numbers. Locked/unlocked filters combine with search, and each full list entry shows its shape, group, and lock state.

Filtering does not change geometry or selection. When the selected part is outside the results, the editor identifies it and offers **Show selected part**, which clears the filters and restores focus to that part. Enter selects the first search match; Escape clears the query. Finder state is local to the session and does not add undo entries.

The selected-part heading now has a **Frame** button that centers the camera on that primitive. The existing transparency toggle sits directly below the heading for easier access while editing.

## Validation

- **63 focused tests passed:** 27 sculpt editor tests, 20 panel tests, and 16 workbench tests. The initial sculpt setup hook exceeded its 10-second allowance; its isolated rerun passed with a 30-second setup allowance.
- New real-WebGL workflows passed at **1440×1000** and **390×844**, including combined filtering, keyboard selection, actual camera targeting, actual mesh transparency, selection recovery, and unchanged geometry/history.
- Existing exact-edit browser workflows passed at both sizes, covering section navigation, materials, validation, cancellation, undo/redo, movement, and rotation.
- All four browser workflows reported no runtime errors, failed requests, or HTTP errors.
- Desktop part-library and phone focus screenshots were visually reviewed.
- Source/public copies match; scoped whitespace checks passed.

Artifacts: `scratch/geometry-sculpt-parts-2026-09-08/`. Previous editor regression script: `scratch/geometry-sculpt-refinement-2026-09-08/browser.cjs`.

This pass validates desktop and phone Sculpt controls, not physical headset hardware.
