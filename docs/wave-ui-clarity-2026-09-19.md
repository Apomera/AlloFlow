# Wave Lab UI clarity — September 19, 2026

The main controls now distinguish Animation speed from Wave speed in medium. Each has a short explanation linked to its slider for assistive technology. Readouts show playback multipliers (×), frequency (Hz), and wave speed (m/s). All four primary sliders have associated visible labels and minimum 44-pixel heights. Control cards wrap at narrow widths.

Simulation behavior, slider ranges, keyboard operation, and activities are unchanged.

## Verification

- 21 tests passed across wave accessibility, form semantics, canvas lifecycle, and advanced math/wave investigation suites.
- Component browser verification passed in default, dark, and high-contrast themes at 1120, 375, and 320 pixels: nine viewport/theme combinations.
- Changing animation speed to 2× left all live physical measurements unchanged. Changing wave speed to 500 m/s at 2 Hz produced a 250.0 m wavelength. Arrow-key adjustment of playback to 2.1× retained physical speed at 500 m/s.
- Verified label associations, linked help text, units, target heights, and control-card overflow with increased text spacing. The narrow-screen layout was visually inspected. No browser runtime errors occurred.
- Source/public mirrors match; catalog JSON, JavaScript syntax, and scoped whitespace checks passed.

Evidence: scratch/wave-ui-clarity-2026-09-19/. Browser checks use a mocked host context with real React, tool modules, and application styles; this is not a full deployed-app audit. Changes remain local; no deployment was made.
