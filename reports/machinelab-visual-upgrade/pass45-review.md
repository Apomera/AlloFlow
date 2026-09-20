# Machine Lab pass 45: restore and try again

Compare a change now includes Restore saved setup. It restores only the active station's saved parameters, clears proof feedback tied to changed settings, and returns keyboard focus to the first changed slider. The current camera, held pose, other station settings, and saved references remain intact. Restore is disabled when the setup already matches the reference. Saved values must fall within each station control's allowed range before they can be offered for restoration.

The force and travel cards now have text-and-arrow indicators: Less, More, or Same. These describe the current result relative to the saved result and remain legible without color. The comparison stays inside the existing optional disclosure for grades 6–8 and 9–12.

Validation: **228 unique UI tests and 357 Chromium browser checks passed**. The initial UI run passed 220 tests but the translation worker timed out during startup. An isolated final retry passed all eight translation tests. Browser checks cover all six stations at 1150/390/320 pixels in three themes, keyboard restore and focus return, starting another experiment after restore, direction indicators and numeric results, restoration of several parameters, clearing stale proof feedback, camera and pose preservation, other-station reference preservation, rejecting out-of-range saved values, and recovering valid geometry from an invalid ramp. Captured 33 screenshots and visually inspected light phone, dark desktop, and system forced-color layouts. Source/desktop parity, syntax, and scoped whitespace checks passed. Existing React key warnings in other views remain.

- [Phone restore control and indicators](pass45-light/comparison-lever-320.png)
- [Dark desktop comparison](pass45-dark/comparison-screw-1150.png)
- [System high contrast](pass45-contrast/comparison-forced-colors.png)
- [Validation details](pass45-summary.json)

Runtime validation used Chromium; no physical touch-device or screen-reader session was performed.

Changes remain local. No commit, push, or deployment was performed.
