# Selection presentation — actual browser evidence

The baseline used frozen production sources in a local React host with the actual Three.js renderer. One SwiftShader browser ran at a time, at 1440×900 and 390×844, DPR 1. The same off-center pavilion contains 44 selected blocks, including rotated wedges/slabs/quarters; one unrelated glass block makes the complete editable world 45 blocks. Fixed overview cameras were used for matched images, without clearing production helpers.

## Baseline observations

- The desktop retained-selection image shows a full amber box cage over the roof, posts, and base. Its `Box3Helper` has opacity 0.85, disabled depth testing, and render order 998. Closing the inspector retained eight visible dimension objects and 44 selection glows in this scene. This compounds the boundary and label clutter. At the farther phone camera, the transient measurement/glow objects had cleared, leaving the full cage.
- The expanded inspector uses cyan/purple interior cards and a saturated purple action among otherwise pine controls. The desktop overlay can obscure a centered creation until it is closed or the user uses Focus creation.
- The phone dock presents Select and Send to Print Lab first and keeps both actions enabled, hit-testable, and at least 44px high. Other actions require scrolling. The old Clear selection action is only 36px high on both sizes.
- The physical envelope originally presents an unlabeled three-number dimension tuple. Explicit axis labels would make the relation to printer-bed dimensions clearer.
- The selected count stays 44 after closing the inspector. Actual Send transfers the exact 15,484-byte selected STL. Actual Revise returns all 45 authored blocks, selected block metadata, and undo/redo history unchanged. There were no page or console errors.

Evidence: `before-results.json`, frozen bytes in `before-source/`, and `verify-selection-baseline.cjs`.

Baseline images:

- `before-selection-1440x900.png` — retained cage, measurement labels, and glow.
- `before-measurement-1440x900.png` — expanded inspector interior treatment.
- `before-dock-390x844.png` — phone dock and pinned handoff actions.
- `before-print-entry-1440x900.png` and `before-print-entry-390x844.png` — actual Print Lab entry.

## Final verification

The final two-viewport workflow passed with no page, console, or shader errors. The matched baseline and final fixture signatures are exact. Close and Clear selection are now 44px high and hit-testable; pinned Send receives a visible 3px outline through actual Tab navigation.

- A single static corner frame has 48 vertices (24 short corner segments), replacing the full box cage. The creation's material surfaces are visibly clearer in the focused view. All selected fractional mesh vertices fit at both sizes.
- Meadow and Studio hide the corner frame synchronously. Renderer instrumentation observed zero frames with the selection frame visible during Showcase entry, scene-look changes, and the actual phone image export. Exit restores the exact focused camera pose and visible selection marker.
- The phone PNG is 991×2048, 393,474 bytes, and visually inspected. It contains no selection markers or UI overlays. Renderer export preserves the camera and exact selected STL/history.
- The default envelope explicitly labels Width 30mm, Depth 20mm, and Height 25mm. A retained 20mm-per-block scale produces 120×80×100mm. An asymmetric profile correctly marks only the dimensions exceeding its own bed; a width-only limit uses the singular accessible message.
- Actual Send transfers all 15,484 selected STL bytes unchanged at 20mm per block. Print Lab displays/persists that scale. Actual Revise returns all45 authored blocks, the44-block selection, complete undo/redo stacks, and20mm print context.

Manual inspection found one phone overlap in the first complete run: the collapsed Build launcher occupied x161,y588,width68,height59 inside the expanded inspector. A narrow final correction hides that launcher while the phone disclosure is expanded. The supplemental run confirms expand→collapse→expand→scroll→Close restores the launcher at the right times, retains a reachable44px Close, and preserves exact geometry/STL/history. The final expanded and scrolled screenshots have no launcher over the inspector text.

The raw initial final-harness attempt is preserved in `after-first-attempt-results.json`. It stopped because the harness expected Previous view after Showcase; Showcase deliberately releases Focus ownership. The corrected run verifies exact Showcase-entry camera restoration instead. This was a verifier assumption, not a production failure.

Final evidence:

- `after-results.json` — full desktop/phone workflow and PNG/Print Lab checks.
- `supplemental-results.json` — final phone overlap correction and current source hashes.
- `selection-visual-summary.json` — combined assertions and exact fixture/source verification.
- `after-focus-1440x900.png` and `after-focus-390x844.png` — clear creation silhouettes and selection corners.
- `after-envelope-1440x900.png`, `after-envelope-390x844.png`, and `after-envelope-over-limit-390x844.png` — labeled physical dimensions.
- `after-showcase-studio-390x844.png` and `after-studio-export-phone.png` — clean Studio UI and high-resolution export.
- `supplemental-measurement-expanded-390x844.png` and `supplemental-measurement-expanded-scrolled-390x844.png` — final expanded drawer clearance.

These checks use actual local WebGL through SwiftShader and touch-enabled Chromium; they are not physical iPhone/Safari tests. Printer readiness remains advisory and no printer was connected. Source edits and separate unit regression aggregation belong to the parent agents; this subtask changed report scripts/evidence only.
