# Showcase: use, export, and reopen a creation

Showcase now has a **Use & export** panel that lets a finished structure move directly into another editing session or the 3D printing workflow.

| Action | Result |
| --- | --- |
| Download editable JSON | An AlloFlow Geometry World file containing the selected blocks, materials, shapes, and quarter-turn rotations. The creation is centered above the sandbox floor for reopening. |
| Download STL | Geometry from the selected blocks in millimeters, using the current millimeters-per-block setting. Import at 100% scale in a slicer. |
| Open in Print Lab | The existing Print Lab workflow with the selected geometry, explicit scale, and editable source model. Revise restores the full building workspace and original building camera. |
| Choose editable JSON | Validates an AlloFlow Geometry World file and shows its title, block count, and bounds before replacing the current sandbox. |
| Save image | The existing high-resolution PNG export, also available from the main Showcase toolbar. |

The panel uses warm ivory surfaces, green accents, simple line icons, grouped actions, and readable scale information. Its body scrolls on smaller screens while the heading and Close control remain available. Controls have at least 44-pixel height in all four tested viewport sizes.

Keyboard focus stays in the panel. Closing it returns focus to **Use & export**. Canceling an import preview returns focus to **Choose editable JSON**, and the next Escape closes the panel before a second Escape leaves Showcase. File operations are guarded while an image is encoding.

Editable JSON import supports Geometry World block data; it does not convert arbitrary STL meshes back into editable blocks. JSON retains the existing block-file format and does not store physical print scale. STL carries geometry rather than the virtual material appearance; choose physical filament in Print Lab or a slicer. Replacing a sandbox starts a new editing baseline and cannot be undone, which the confirmation preview states.

## Verification

- **197 unique automated tests passed across 11 suites.** This covers selected JSON/STL exports, validation, scale conversion, partial and rotated blocks, image-export guards, keyboard handling, retained selection, Studio/camera framing, and the existing Print Lab workflows.
- Actual-browser checks passed at **1440 × 900, 390 × 844, 320 × 700, and 844 × 390** using the application's React and THREE sources.
- A 42-block selected creation exported without the unrelated 43rd block. The STL contained 320 triangles at 12.5 mm per block, with zero measured vertex-scaling error and unchanged normals.
- Both downloads preserved the live world, retained selection, undo/redo history, and Showcase presentation. Invalid files and preview cancellation preserved the model. A confirmed import restored the downloaded blocks, shapes, and rotations.
- Showcase → Print Lab → Revise preserved the full workspace, selected geometry, exact STL bytes, undo/redo history, custom scale, and original building camera.
- No browser, console, or shader errors were reported. Canonical source and desktop mirror match, parse successfully, and match the final browser snapshots.

The first new data test run used a byte-for-byte comparison after intentionally recentering a model. That assertion was corrected to compare triangle coordinates and normals within 1e-6, accounting for floating-point effects from the changed origin. Exact-byte checks remain for unchanged-position round trips and scaled-copy downloads. The final counts use the latest result for each test.

These are local software and browser checks; a physical print was not performed.

## Preview

![Desktop Showcase export panel](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-files-2026-09-09/files-1440x900.png)

![Phone Showcase export panel](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-files-2026-09-09/files-390x844.png)

[Import confirmation preview](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-files-2026-09-09/import-preview-390x844.png) · [Narrow phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-files-2026-09-09/files-320x700.png) · [Landscape phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-files-2026-09-09/files-844x390.png)

## Evidence

[Final verification summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-files-2026-09-09/showcase-files-summary.json) · [Actual-browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-files-2026-09-09/browser-results.json) · [Data implementation notes](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-files-2026-09-09/SELECTED-FILES-DATA.md)

Production changes are confined to the Geometry World builder module and its desktop mirror. Core rendering and Print Lab source files are unchanged in this pass.
