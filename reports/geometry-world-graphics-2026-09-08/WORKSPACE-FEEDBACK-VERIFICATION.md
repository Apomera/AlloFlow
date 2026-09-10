# Geometry World workspace feedback verification

The final verification passed. The measured pavilion, utility controls, achievement treatment, and retained-selection workflow work across the tested desktop and phone layouts. No page exceptions or shader errors occurred. All QA browsers and local harness servers were closed after capture.

The full functional browser run originally found two achievement CSS conflicts. Their original failing result is preserved; a focused refresh on the corrected source passed both cases. A separate final browser run verified the latest builder change for editing a selection after closing its inspector. The [consolidated result](workspace-feedback-verification.json) records these three evidence stages without rewriting the earlier failures.

## Visual evidence

| Emulated viewport | Final workspace capture | Result |
| --- | --- | --- |
| Desktop 1440 × 900 | [Measured pavilion and achievement](workspace-feedback-1440x900-achievement-dimensions.png) | Consistent pine and ivory controls, readable labels, clear scene |
| Phone portrait 390 × 844 | [Measured pavilion and touch controls](workspace-feedback-390x844-achievement-dimensions.png) | Compact achievement clears the touch controls |
| Narrow phone 320 × 700 | [Narrow workspace](workspace-feedback-320x700-achievement-dimensions.png) | Achievement width 219.73 px; no critical control overlap |
| Phone landscape 844 × 390 | [Landscape workspace](workspace-feedback-844x390-dimensions.png) | Achievement hidden; utility and touch controls remain accessible |

These captures were visually inspected. The 390 px portrait capture gives the clearest phone overview of the scene, occupied-volume caption, achievement, and controls together.

## Verified behavior

- Real Fly, Undo, Redo, Home, measurement, inspector-close, settings, and Showcase controls were exercised. Utility controls use SVG icons, retain accessible names, and have targets at least 44 px tall. Fly exposes its pressed state, and Down disappears in walking mode.
- Undo and Redo update both the model and visible toolbar immediately. The full workflow restores the exact original world, selected STL, history, and placed count after its intentional Undo/Redo pair.
- Measurements distinguish occupied volume from the enclosing box. The 48-part fractional pavilion has bounds 5 × 4 × 6, but its caption correctly reads “Occupied V = 40 3/4 cu.” The detached solid two-cube prism correctly reads “2 × 1 × 1 = 2.” Actual canvas text and sprite metadata were checked.
- The longer occupied-volume caption uses a 416 × 80 texture. Repeated real measurements held GPU texture count at 11 in all four viewports, with no accumulating label textures observed.
- The measurement inspector fits the tested viewports, its close control is accessible, and it has no horizontal overflow. Achievements are suppressed while the inspector, settings modal, or Showcase is visible.
- Closing the inspector retains Selected count, Showcase/Explore actions, and the print envelope. In the final focused check, adding a connected block updates Selected from 48 to 49 after periodic refresh while the inspector remains closed. Undo returns to 48 selected parts and the exact original STL while keeping the inspector closed.
- The selected pavilion STL remains 12,984 bytes, SHA-256 `d89ff2407b55695caea0a5a5b1f0a8972d2cc3849c8d2b0ab8f030d04ab51715`. The final focused check intentionally creates a redo entry by undoing its added block; it verifies restored model/STL, rather than claiming untouched history for that edit.

## Regressions resolved during this pass

The browser checks exposed stale Undo/Redo controls after successful engine history actions, missing retained selection UI after inspector dismissal, and achievement CSS overrides at 320 px and short landscape. The implementation now publishes successful history changes, renders the retained selection summary, and removes the stale achievement minimum-width/display overrides. A final builder follow-up also prevents periodic connected edits from reopening a deliberately closed inspector and caches retained summaries by content. Focused tests and fresh browser checks verified these changes.

## Evidence and reproduction

- [Full functional run](workspace-feedback-results.json): all four viewport workflows completed; preserves the two original achievement CSS failures.
- [Final achievement refresh](workspace-feedback-toast-refresh-results.json): PASS; four final viewports, no overlaps or errors.
- [Final closed-inspector edit check](workspace-feedback-closed-inspector-edit-results.json): PASS; latest builder source, connected selection update and exact STL restoration.
- [Connected-edit screenshot](workspace-feedback-closed-inspector-connected-edit.png).
- Harnesses: [full workflow](verify-workspace-feedback.cjs), [bounded achievement refresh](refresh-workspace-feedback-toast.cjs), [bounded retained-selection edit](verify-closed-inspector-edit.cjs).

Run each harness with Node from the repository root. They use the local React/THREE audit harness, Chromium with SwiftShader, DPR 1, and the saver render profile. The populated fixture contains a 48-part asymmetric pavilion plus a detached two-cube prism, for 50 student blocks; its placed counters are synchronized after seeding. Phone cases use touch-capable viewport and phone user-agent emulation. A real earned achievement notification is held temporarily for repeatable screenshots.

This is actual browser/WebGL rendering and interaction evidence, not physical-phone or hardware-GPU performance certification. This QA subtask changed report and harness files only.
