# Geometry World: selected creation and phone controls

The selected build now leads Free Build Studio with a pale green summary, a clear block count and bounds, and a direct explanation of what Showcase and Print Lab will use. Inspection and print controls precede the general building tools while a valid selection is retained. Clearing the selection restores the general building layout.

The compact phone toolbar now applies through 420 px. Undo and Redo counts no longer push Home and Clear outside the viewport at 390 or 414 px. All five- and six-button states remain reachable with at least 44 × 44 px targets.

## Visual refinements

- Selected creation gets a cube emblem, consistent typography, two focused metrics, and a subtle pale green surface.
- The visible action reads “Select another build” while a build is retained. Its accessible action name and behavior are preserved.
- Redundant selected-state guidance is visually hidden but remains available to screen readers. Compact padding keeps the complete summary card visible at 390 × 844 and 414 × 896.
- The high contrast theme retains black surfaces, cyan borders, and white summary text.
- Stable React keys preserve a focused print-scale input and its unfinished draft when selection changes or the panel reorders.
- A transient measurement of the floor or another build cannot relabel the retained selection. A fallback measurement without a retained selection does not claim to be the selected export scope.

## Verified results

**98 assertions passed across 6 files. Final test process, baseline browser process, and final browser process all exited 0.** Canonical files match the desktop mirrors and the exact browser source snapshot; all three scripts parse. Print Lab source is unchanged.

| Suite | Assertions | Result |
|---|---:|---|
| geometry_world_dock_selection.test.js | 2 | Passed |
| geometry_world_empty_guidance.test.js | 10 | Passed |
| geometry_world_print_workflow.test.js | 14 | Passed |
| geometry_world_scale_controls.test.js | 39 | Passed |
| geometry_world_selected_files.test.js | 23 | Passed |
| geometry_world_selected_inspector.test.js | 10 | Passed |

The existing guidance and dock tests were updated for the new selected-summary markup and wording while preserving their selection/export assertions. Ten focused inspector cases cover fallback truth, retained selection, clearing, scale draft/focus/DOM continuity, and exact selected STL handoff.

| Inspector viewport | Selected summary | Card visibility | Page horizontal overflow |
|---|---|---|---|
| 1440 × 1000 | 60 blocks; 6 × 4 × 5 | Visible without scrolling | None |
| 390 × 844 | 60 blocks; 6 × 4 × 5 | Visible without scrolling | None |
| 414 × 896 | 60 blocks; 6 × 4 × 5 | Visible without scrolling | None |
| 320 × 700 | 60 blocks; 6 × 4 × 5 | Scroll within the inspector | None |
| 844 × 390 | 60 blocks; 6 × 4 × 5 | Scroll within the inspector | None |

Browser coverage also includes ten utility states at 320, 390, 414, 430 and 844 px, with and without Redo. The stress fixture displays 123 Undo and 234 Redo entries. At 320–414 px every control has a native center hit target, fits the viewport, and meets the 44 px minimum. The recorded 430 and 844 px utility layouts are unchanged from the baseline. Native fullscreen was entered and exited through the actual controls at 390 px.

The fixture contains a 60-block pavilion and two separate blocks elsewhere. Selecting another build updates the summary to two blocks; reselecting the pavilion returns it to 60. Unrelated measurements keep the retained summary at 60. Inspector actions preserve exact block data, raw STL hash, undo/redo history, camera, placement count, mesh identity, materials and vertex data. The moved Match action still copies the aimed wood material.

Sending the pavilion to Print Lab and using **Revise in Geometry World** restores the selected 60-block pavilion at **12.5 mm per block**, together with all workspace blocks. The selected-files and print-workflow suites cover the export/mesh behavior. This pass changes presentation and panel ordering; it adds no new file format.

The browser recorded no page, console, or shader errors. Visual inspection covered desktop, phone, short landscape, high contrast, and the before/after crowded toolbar. The browser harness uses real app scripts, software WebGL, and a controlled ray-hit fixture with native UI actions. It verifies digital handoff; no physical print was performed. On very short screens, the inspector remains internally scrollable and can be collapsed to recover building space.

## Before and after

Desktop before:

![Previous desktop inspector](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/before-selected-1440x1000.png)

Desktop after:

![Refined desktop inspector](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/after-selected-1440x1000.png)

Phone selection after:

![Phone selected creation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/after-selected-390x844.png)

Crowded phone toolbar before:

![Previous phone toolbar](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/before-utilities-390-six.png)

Phone toolbar after:

![Refined phone toolbar](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/after-utilities-390-six.png)

## Evidence and source identity

[Final verification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/final-verification.json) · [Test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/final-tests.json) · [Browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/after-browser.json) · [Browser baseline](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-control-polish-2026-09-10/before-browser.json)

| Script | SHA-256 | Desktop mirror |
|---|---|---|
| stem_tool_geometryworld.js | 9e0c2f5f1973eb2fb5baded9f9ac81f0f7249356f834767daaf5a0b3952e55cc | Identical |
| stem_tool_geometryworld_builder.js | 0d32e048b1654d4c804f50a7b5f56dda01a0f02942a46f2d0fffacba6c62ffa8 | Identical |
| stem_tool_printlab.js | f4629f78eea79605739fa4793d1bda36877a7b3cd848be89b3bc136e4651f742 | Identical |

An independent source review found no actionable issues with selection validity, keyed component identity, or accessibility. Final browser validation and focused suites cover the subsequent phone padding refinement.
