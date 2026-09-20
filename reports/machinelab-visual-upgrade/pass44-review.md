# Machine Lab pass 44: compare a change

The optional Compare a change disclosure sits below the tuning controls for grades 6–8 and 9–12. Save current setup captures the selected station's input settings. Moving a slider then lists the settings that changed and compares saved versus current effort force and hand travel. Dashed bars identify the saved result and filled bars identify the current result, with a shared scale inside each pair and explicit numeric values.

Each station keeps its own reference in Machine Lab state. Replace saved setup updates that station's reference; Clear comparison removes only that reference and returns keyboard focus to Save current setup. Saving leaves the live parameters, held motion pose, and proof state unchanged. Calculations are derived from the saved inputs through the same ideal-machine math as current results. Invalid stored references are ignored, and invalid current setups cannot be saved. Younger reading bands retain their existing experience.

Validation: **228 UI tests and 240 Chromium browser checks passed**, covering six machines at 1150/390/320 pixels in light, dark, and high-contrast themes. Checks cover keyboard save, slider changes, reference replacement, clearing and focus restoration, reference independence across station switches, exact input preservation, numeric results and bar scales, malformed saved data, invalid current geometry, reading-level visibility, and overflow. A doubled lever effort arm correctly changes effort from 200 N to 100 N and hand travel from 1 m to 2 m. Captured 33 screenshots and visually inspected light phone, dark desktop, and system forced-color layouts. Source/desktop parity, syntax, and scoped whitespace checks passed. Existing React key warnings in other views remain.

- [Phone comparison](pass44-light/comparison-lever-320.png)
- [Dark desktop comparison](pass44-dark/comparison-screw-1150.png)
- [System high contrast and doubled lever arm](pass44-contrast/comparison-forced-colors.png)
- [Validation details](pass44-summary.json)

References live in the existing Machine Lab tool state; no separate server storage was introduced. Validation used Chromium without a physical touch-device or screen-reader session.

Changes remain local. No commit, push, or deployment was performed.
