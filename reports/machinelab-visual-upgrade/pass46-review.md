# Machine Lab pass 46: saved positions on the tuning sliders

Saving a comparison now adds an outlined triangular marker above each station slider at its saved position. The marker stays fixed while the current thumb moves. A saved-value readout and Changed / Matches saved label make the baseline visible beside each control, even when Compare a change is collapsed. These additions appear only after saving a valid reference in the two older reading bands.

The markers use the same range limits and thumb-center geometry as the tuning controls, including the endpoints. They do not intercept pointer input. The saved value and change label are linked to the native range input through aria-describedby; the SVG marker itself is decorative. Markers follow reference replacement, reflect restoration, and disappear when the comparison is cleared. Slider and comparison validation now share the same helper so malformed references cannot produce partial baseline indicators.

Validation: **228 UI tests and 372 Chromium browser checks passed**. Coverage includes all six stations at 1150/390/320 pixels in light, dark, and high-contrast themes; saved marker positions and endpoint alignment; changed/matching status; description links; saving, replacing, restoring, clearing and keyboard focus; numeric comparison results; invalid references; and reading-level boundaries. Captured 33 screenshots and visually inspected light phone, dark desktop, and system forced-color layouts. Source/desktop parity, syntax, and scoped whitespace checks passed. Existing React key warnings in other views remain.

- [Saved positions on a phone](pass46-light/comparison-lever-320.png)
- [Dark desktop controls](pass46-dark/comparison-screw-1150.png)
- [System high contrast](pass46-contrast/comparison-forced-colors.png)
- [Validation details](pass46-summary.json)

Runtime validation used Chromium without a physical touch-device or screen-reader session. A screenshot-read approval timed out once and succeeded on its permitted retry.

Changes remain local. No commit, push, or deployment was performed.
