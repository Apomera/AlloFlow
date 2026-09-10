# Machine Lab: distinct distance markers (pass 17)

All six stations now use a solid diamond for effort distance and an open ring for load distance. The larger markers and matching legend symbols provide a shape cue in addition to color. The high-contrast legend uses the same yellow and cyan as the 3D scene, and the scene description names both shapes.

The open ring faces the camera at render time, including the first frame after a camera change while the simulation is paused. Both markers retain the existing distance calculations and shared scale. Their increased height keeps them clear of the tracks throughout the motion.

## Validation approach

Seventeen new tests cover the shapes across all six mechanisms and reduced-motion settings, marker clearance and track positions, camera-facing orientation, and accessible legend descriptions across grade bands. Rotated-ring clearance uses transformed surface vertices to avoid the conservative overestimate from a rotated bounding box.

The real-renderer reviews cover front and rear views of every station, equal and reversed tradeoffs, a grayscale canvas capture, mobile keyboard controls, held poses, focus toggling, and reduced motion. Camera alignment is checked against the actual render camera.

[Grayscale shape comparison](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass17-light-final/equal-trade-grayscale.png>)

[Default pulley markers](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass17-light-final/pulley-focus.png>)

## Publishing

Changes remain local. Source and desktop mirror were checked for independent edits before synchronization. No commit, push, or deployment was performed in this pass.

## Final results

All 324 focused tests passed across five files covering geometry, views, accessibility, cameras, and translation. The final run completed three files; the two missing files were rerun successfully using a threads pool. The whole Machine Lab suite was not rerun for this scoped marker change.

All three browser themes passed 15 desktop scenarios each, including a grayscale canvas, plus mobile, keyboard, focus, held-pose, and reduced-motion checks. No browser errors or horizontal overflow were reported. Visually reviewed the light grayscale comparison and high-contrast mobile pulley.

Source and desktop mirror are byte-identical. Syntax and scoped whitespace checks passed. SHA-256: c93a1f35174b11d9c49f624bd0eb02c01ff089314ea5fee25ce3abb9610cda63.
