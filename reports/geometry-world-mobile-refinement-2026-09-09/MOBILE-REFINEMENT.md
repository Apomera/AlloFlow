# Geometry World: more room to build

This pass refines phone composition and measurement readability, and reduces repeated selection analysis while the scene is idle.

## Phone building controls

In portrait phone sandbox editing, the Fly, Undo/Redo, Home, and Clear controls move from a wide panel in the middle of the scene to a slim lower row. The joystick and touch building actions sit above it. Labels, history counts, and primary touch actions remain available, with at least 44-pixel utility targets. The material and shape trays remain in their familiar lower positions.

This arrangement is scoped to portrait editing on screens at least 620 pixels tall. Measurement mode and short landscape screens retain their own layouts. Focus creation uses the actual control rectangles to take advantage of the larger clear region.

## Compact measurement inspector

The inspector keeps the title, principal dimensions, and occupied volume visible. On phones, a disclosure opens the equation, layer explorer, and detailed measurement tools. Closing and reopening the inspector retains the selected build; detailed exploration remains available to keyboard and touch users. Desktop keeps the expanded information layout.

Incomplete measurements describe a lower bound on the volume actually measured, rather than treating a fractional block count as cubic units.

## Selection analysis

Idle polling now compares saved values for the selected cells and their immediate six-face neighbors. A complete selection can only gain or lose connected cells through an existing member or this boundary, so unrelated edits elsewhere in the world do not trigger a fresh measurement. Every disconnected retained piece contributes its own boundary.

Changes to membership, occupancy, shape, rotation, material, volume, measurement layer, lesson ownership, engine identity, or measurement implementation refresh the result. New connecting blocks can bring an entire neighboring build into the selection. Incomplete and null results are retried. Focus, Showcase, and Print Lab continue to validate the selection when invoked.

After a fresh complete measurement, the cache saves normalized members and boundary values. Subsequent idle polls compare primitive values directly, without rebuilding a JSON snapshot or repeating connected-component traversal. The unchanged result also avoids rebuilding the downstream selection signature.

In a warmed Node diagnostic using the actual core measurement code, 40 idle polls avoided 40 traversals for each fixture. That removed 40, 1,800, and 35,000 accepted block visits for selections of 1, 45, and 875 blocks respectively, each in a world with 625 protected floor cells. Final median helper times were about 0.002/0.010 ms, 0.030/0.298 ms, and 0.369/3.981 ms for cached/fresh measurement. These are shared-host CPU diagnostics, not browser frame-rate measurements; rendering and STL work are outside this timing probe.

## Visible results

The same 44-block off-center pavilion, with fractional pieces and an unrelated nearby block, was measured before and after this pass. Focused creation height is measured from the actual projected geometry:

| Viewport | Before | After | Height ratio |
| --- | ---: | ---: | ---: |
| 320 × 700 | 57.1 px | 149.1 px | 2.61× |
| 390 × 844 | 151.7 px | 205.4 px | 1.35× |
| 844 × 390 | 92.3 px | 92.3 px | 1.00× |
| 1440 × 900 | 336.5 px | 336.5 px | 1.00× |

The 390-pixel phone inspector is now 199 pixels tall instead of 302. The 320-pixel inspector grows from its previously clipped 158-pixel panel to a complete 199-pixel summary; its essential content now fits without scrolling. Detailed tools remain available when opened.

![Refined 320-pixel phone building layout](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-mobile-refinement-2026-09-09/after-focus-320x700.png)

![Compact phone measurement inspector](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-mobile-refinement-2026-09-09/after-measure-320x700.png)

## Verification

**284 unique regression tests passed across 12 files.** Coverage includes the new inspector and selection-cache behavior, keyboard access, display controls, camera framing, input transitions, measurements, retained selection, and Print Lab workflows. The three existing display/settings cases that failed during the initial run passed unchanged in a targeted retry; counts are deduplicated across both runs.

Four viewport browser checks passed layout and interaction assertions: 320 × 700, 390 × 844, 844 × 390 with touch input, and 1440 × 900. Checks include full five-button utility rows with Undo and Redo both available, 44-pixel targets, hit testing, keyboard disclosure and layer controls, open details surviving a connected edit and real keyboard Undo, selection after Close, exact Previous view restoration, and unchanged STL bytes. The final model and selection match the initial fixture; complete history matches the explicit live-edit checkpoint after its Undo.

The original idle assertion counted the one valid refresh triggered by installing its measurement wrapper. A separate supplemental check settled that wrapper before counting and confirmed zero additional idle traversals. Its iPhone-user-agent test at 844 × 390 also passed compact/expanded disclosure, touch activation, keyboard and layer controls, scrolling, a sticky 44-pixel Close button, and unchanged selection/STL/history. Both browser runs recorded no page, console, or shader errors. The original instrumentation failure is retained and explicitly superseded by this focused check.

Browser checks used local Chromium with Saver rendering and phone emulation; a physical Safari device was not tested.

Detailed evidence: [visual QA](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-mobile-refinement-2026-09-09/MOBILE-VISUAL-QA.md), [inspector checks](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-mobile-refinement-2026-09-09/COMPACT-INSPECTOR.md), and [selection analysis](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-mobile-refinement-2026-09-09/SELECTION-POLLING-REVIEW.md). Final aggregate verification passed: syntax, byte-identical desktop mirrors, and source hashes matching both browser runs. See the [complete verification result](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-mobile-refinement-2026-09-09/refinement-pass-summary.json).
