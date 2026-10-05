# Geometry World Final Visual QA

Verified against the settled source on 2026-10-02 using Chromium, local React and three.js, and software WebGL. Diagnostic browsers and temporary servers have closed.

## Current Results

- Main home, all four home routes, route return focus, and the recommended lesson launch work at 1280, 390, and 320 pixels wide.
- The learning compass opens the path and focuses its heading. Numbered objectives, the next pending objective, and the concept reminder work. A real Quiz Master answer marks the first objective complete, advances the next marker to 2, updates the question score to 1/3, and changes the compass task.
- The final Close learning path icon restores focus to the compass on desktop, 390-pixel phone, and 320-pixel phone.
- With a measurement hiding the compass, Close returns focus to the visible world surface when the toolbar is collapsed and to the visible Objectives quickbar button in fullscreen. Both focused browser cases pass.
- Keyboard camera movement and basic Free Build placement work. At 320 pixels, the existing Aim at build area action followed by Place adds exactly one student cube.
- Home and learning path pass text-spacing, forced-colors, contrast-theme, and reduced-motion checks across all three widths. Relevant tested buttons and the concept summary are at least 44 pixels high. Sampled text contrast ratios meet 4.5:1.
- Scoped axe-core WCAG A/AA audits report zero violations on the final desktop home and learning path.
- Settled desktop and phone captures have one live canvas filling its viewport, no workspace overflow, no visibly clipped controls, and no runtime errors. Center pixel samples contain 1024/1024 nonblack pixels with substantial color variation.
- The measurement feedback toast avoids the phone action rail and joystick at both 390 and 320 pixels. Its right edge is 20 pixels before the action rail and its bottom is 10 pixels above the joystick. Updated screenshots replace the earlier overlapping feedback frame.

## Settled Screenshots

`final/` contains the desktop main home, guided lesson preview, lesson world, learning path, open concept reminder, measurement, and Free Build. It also contains the final 390-pixel main home and guided lesson preview.

`final-phone/` contains the final 390-pixel lesson world, learning path, open concept reminder, measurement, and Free Build. Its report confirms successful close focus return and live canvas checks.

`build-320/` contains current 320-pixel home, lesson world, learning path, and placement screenshots, plus `states.json` documenting close focus return and successful placement after Aim.

`text-spacing-320/` contains the focused text-spacing screenshot and computed layout metrics. The adapted toolbar is 75.5 pixels high with no vertical overflow; the path begins below it at 90 pixels and scrolls internally within the viewport.

`focus-edge-cases/report.json` records the passing collapsed/fullscreen focus cases and both phone feedback nonintersection checks.

## Superseded Diagnostics

`interactions/report.json` and `interactions-small-phone/report.json` preserve earlier observations. Their 3-pixel toolbar overflow was fixed by observing the toolbar height and positioning the learning surfaces below it. The focused text-spacing capture confirms the fix.

The earlier 320-pixel placement failure came from the probe aiming exactly at a shared ground voxel edge. The ray selected an occupied side cell instead of a top face. `build-320/states.json` records this diagnosis and the subsequent successful Place action after the existing Aim action. No placement source change was needed. The reusable interaction runner now uses Aim before asserting placement.

An earlier capture exceeded its lesson-mount timeout. The preview harness now explicitly waits for the React `startHomeLesson` bridge before launching, and the missing phone captures passed on the guarded run. The stalled captures yielded no product assertion failure.

This is a focused Geometry World preview; it does not exercise the full application shell, teacher integrations, external AI services, or physical printing.
