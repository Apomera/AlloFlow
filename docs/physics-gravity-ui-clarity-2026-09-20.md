# Physics Lab gravity presets — September 20, 2026

The Earth, Moon, Mars, and Jupiter buttons now form a named Gravity presets group. Each shows its existing gravity value in m/s² and exposes whether it is selected. A short explanation makes clear that presets change gravity only, preserving launch angle, velocity, mass, and air drag. Cards wrap and have minimum 44-pixel heights.

## Verification

- 17 relevant Physics Lab tests passed.
- Component browser checks selected all four presets with Enter, verified their displayed values and selected states, and confirmed every other simulation state field stayed unchanged.
- Setting custom gravity to 7 m/s² cleared preset selection; Space restored Earth at 9.8 m/s².
- Layout and target-size checks passed at 1120, 375, and 320 pixels in default, dark, and high-contrast themes (nine combinations), including increased text spacing. The phone-width group was visually inspected.
- No browser runtime errors. JavaScript syntax, catalog JSON, source/public equality, and scoped whitespace checks passed.

Evidence: scratch/physics-gravity-ui-2026-09-20/. The browser harness uses mocked host context with real React, tool modules, and application styles; this is not a full deployed-app audit. Changes remain local; no deployment was made.
