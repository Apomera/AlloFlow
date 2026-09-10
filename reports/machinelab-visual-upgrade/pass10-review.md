# Machine Lab: tenth visual pass

The wedge station now shows a connected splitting assembly with timber that opens according to the blade geometry.

- The blade keeps the selected length-to-thickness ratio across the full control range, including very thin and short, broad wedges. A striking cap and fasteners move with it.
- Both timber halves stay seated on bolted slide rails. Their opening follows the blade slope, so downward travel divided by the total increase in opening matches the selected ideal mechanical advantage. Bevel clearance prevents the actual blade surfaces from overlapping the solid timber.
- Matching end-grain rings and fine lines on the inner faces make the separation visible. The halves translate without rotating through the work bed.
- Effort and load arrows follow the moving assembly. The shorter effort arrow and camera framing keep it visible below the desktop status card. Mobile status cards and legends stay outside the canvas.

**763/763 tests passed across 25 Machine Lab files.** Nine added cases check blade proportions, actual triangle cross-sections against the wood, base contact, striking-cap attachment, force-arrow tracking, reset, reduced motion and the opening-distance ratio. After the final arrow/framing refinement, all **107 geometry and accessibility checks passed again**. Syntax, whitespace and byte-for-byte desktop parity also passed.

Final Chromium/WebGL reviews cover ready and moving poses, minimum and maximum aspect ratios, a square wedge, rear view, 320px and 390px mobile layouts, and reduced motion. Light, dark and high-contrast runs reported no page errors, no horizontal overflow and no mobile overlay obstruction. Temporary automatic-review timeouts were resolved on the permitted retry; all final browser checks completed.

Changes remain local; deployment is still paused.

![Connected wedge and timber grain](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass10-final/workshop10-wedge-ready-detail.png)

![Mobile wedge station](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass10-final/mobile-wedge-320-stage.png)

![Broad wedge in high contrast](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass10-contrast/workshop10-wedge-thick-detail.png)

[Validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass10-summary.json) · [Full test run](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass10-tests.json) · [Final geometry and accessibility checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass10-final-geometry-a11y.json) · [Previous pass](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass9-review.md)
