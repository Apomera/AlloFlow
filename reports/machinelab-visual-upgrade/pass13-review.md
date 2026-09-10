# Machine Lab — motion inspection (pass 13)

All six workshop mechanisms now support a held position anywhere along the working stroke. A percentage slider and Start, Halfway, and Full stroke buttons sit beneath the camera controls. The chosen position remains fixed while learners orbit or zoom.

The geometry uses linear travel for manual inspection, keeping effort/load markers synchronized. Normal playback retains its existing motion curve. Reduced-motion inspection remains static, including decorative lighting. Selecting a pose stops playback; Run demonstration starts a fresh cycle; changing stations resets inspection.

An older demonstration timer now checks its run identity before changing state. The path legend follows the canvas in the layout, avoiding a fixed bottom offset as controls wrap or expand.

## Review evidence

- Real Chromium / WebGL review: 12 held-pose scenarios per theme, covering half and full stroke on all six mechanisms.
- Light, dark, and high-contrast reviews reported no browser errors or horizontal overflow.
- Pulley and wedge at 320px and 390px: keyboard Home, End, and ArrowRight; Close camera while holding a pose; separated mobile HUD, scene, and legend.
- Reduced-motion screw press held at half stroke; old-timer/new-run regression; next-station reset.
- Inspected screenshots: light mobile pulley, dark desktop wedge, high-contrast mobile wedge.
- Final light browser run repeats interaction coverage after adding an explicit accessible-label reference. The final aria-label uses the same accessible name and was verified by the affected test files. The dark and contrast runs precede that attribute-only change.

## Changes and publishing

Source and desktop mirror were checked for independent edits before each synchronization and remain byte-identical. Changes are local. No commit, push, or deployment was performed in this pass.

The screenshots demonstrate schematic working-stroke positions; the percentage is not elapsed playback time or a new physical-distance measurement.

## Regression results

Full Machine Lab run: 831/832 passed across 25 files before the final label convention fix. The only failure was the new slider missing the explicit aria-label required by the existing test.

After that fix, all 252 tests across accessibility, views, visual geometry, and camera controls passed. This includes the previously failing check and 28 new inspection tests. There are no unresolved test failures. The final change only switches the explicit accessible-name attribute; the other full-suite results remain applicable.

Syntax and scoped whitespace checks passed. Source and desktop mirror SHA-256: 9bbcf20c35bc695f5d2d0ceb6aaab22bcb2dd258b95c170562c2ad3aea1f6f1e.
