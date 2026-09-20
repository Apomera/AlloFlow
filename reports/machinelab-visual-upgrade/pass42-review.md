# Machine Lab pass 42: camera orientation guide

An overhead orbit compass and Rotation, Tilt, and Zoom readings now appear inside Rotate & zoom. The compass marker follows the horizontal camera angle; its fixed zero reference makes custom views easier to interpret. The numeric readings use the camera settings already used by the scene. Rotation and tilt are rounded to whole degrees, and zoom to two decimals. The collapsed layout remains compact.

The guide uses a semantic definition list for the readings and hides the decorative SVG from assistive technology. There is no new animation or continuous screen-reader announcement. In system forced colors, the compass uses CanvasText; screenshot review caught and corrected a yellow-on-white compass before completion.

Validation: 255 UI tests and 600 Chromium browser checks passed across six machines, three viewport widths, and light, dark, and high-contrast themes. Camera presets, custom rotation, reset, boundary values, keyboard disclosure behavior, pose preservation, guide readings, SVG bearing, touch targets, and overflow were checked. The high-contrast suite was rerun after the forced-color correction. Captured 39 screenshots in the selected runs and visually reviewed light phone, dark desktop, and corrected system-high-contrast layouts. Source and desktop mirror match byte-for-byte, syntax is valid, and scoped whitespace checks passed. Existing React key warnings in other views remain.

- [Phone camera guide](pass42-light/orientation-windlass-320.png)
- [Dark desktop guide](pass42-dark/orientation-lever-1150.png)
- [Corrected system high contrast](pass42-contrast-final/orientation-forced-colors.png)
- [Validation details](pass42-summary.json)

Browser validation used Chromium; no physical touch-device or screen-reader session was performed. The pass 41 report was also recovered after its earlier save was blocked by the usage limit.

Changes remain local. No commit, push, or deployment was performed.
