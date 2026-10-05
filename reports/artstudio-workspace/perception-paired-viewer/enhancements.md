# Perception Lab: enlarged A/B drawings

Updated October 4, 2026. Changes are left uncommitted.

Revealed, compatible study comparisons now offer **Compare enlarged drawings**. Study A and Study B appear together in the existing modal viewer, with distinct labels and equal drawing scale. Each study keeps its own recorded-trial selection and measurement-guide visibility, and retains those choices after the viewer closes.

The viewer places both drawings beside each other when space allows and stacks them automatically on narrow screens or with enlarged text. **Stack drawings for more space** lets learners use the full available width for each drawing on larger screens. This layout choice lasts for the current opening; it does not change saved observations or the workspace layout.

Both panels show their actual recorded geometry, surroundings, impression, date, values, and complete note. Trial choices remain independent: selecting Trial 2 in A does not silently change B. Both drawings share the same SVG coordinate system and rendered dimensions in either layout.

Only complete, consistent, revealed studies with the same experiment and reference can open together. The viewer closes and removes both drawings if either saved study changes, becomes unavailable, or is hidden, or if the comparison, review, or learner profile changes. Finder filtering and unrelated live drafts preserve the open viewer.

The native modal makes the rest of the page inactive. Keyboard focus wraps through both studies and the layout control. Escape and the close button restore focus to **Compare enlarged drawings**, without collapsing the workspace. Single-study enlargement remains available. No new dependencies, persisted fields, scientific calculations, or report formats are introduced.

## Verification

All 670 tests passed, including 23 new paired-viewer cases and 647 existing Perception tests. Chromium passed 32 paired-viewer groups, 28 unchanged single-viewer groups, and 42 unchanged recorded-preview groups: 102 total. Accessibility checks were clear across five widths, dark/high-contrast/system forced colors, and 200% text. The source and desktop mirror match, all 372 English entries pass parity checks, and tool discovery and integration checks passed. See [validation.json](validation.json).

New coverage is in `tests/perception_lab_paired_viewer.test.js` and `dev-tools/perception_lab_paired_viewer_qa.cjs`. Existing single-viewer and recorded-preview browser assertions run through adapters that change only their output directories.

## Previews

- [Side-by-side drawings](pair-1600.png)
- [Phone layout](pair-390.png)
- [Manual full-width stacking](pair-stacked-1600.png)
- [System dark forced colors](pair-forced-dark.png)
- [Study B at 200% text](pair-large-text-b.png)
