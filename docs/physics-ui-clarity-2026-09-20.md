# Physics Lab display controls — September 20, 2026

Seven display and learning toggles now appear in a named Views and explanations group. Labels explicitly identify Force vectors, Energy display, Physics guide, Flight data, Show your work, Trajectory comparison, and Motion component graphs. The guide's accessible name matches its visible label. Responsive controls wrap text and have minimum 44-pixel heights.

Existing toggle actions and simulation behavior are preserved. Air drag, launch, prediction, and other simulation controls remain outside this display group.

## Verification

- 17 tests passed across Physics Lab form accessibility, focus scope, drag integration, and canvas lifecycle suites.
- Component browser checks exercised all seven toggles with Enter and Space in default, dark, and high-contrast themes. Each activation changed only its intended state field; reactivation restored its selected state.
- Layout and target-size checks passed at 1120, 375, and 320 pixels in all three themes (nine combinations), including increased text spacing. The phone layout was visually inspected.
- No browser runtime errors. JavaScript syntax, catalog JSON, source/public equality, and scoped whitespace checks passed.

Evidence: scratch/physics-ui-clarity-2026-09-20/. The browser harness uses mocked host context with real React, tool modules, and application styles; this is not a full deployed-app audit. Changes remain local; no deployment was made.
