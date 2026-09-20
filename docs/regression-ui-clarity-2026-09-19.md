# Regression workspace UI clarity — September 19, 2026

## Changes

The Regression workspace now has complete activity tab semantics: stable tab/panel links, one tab in the keyboard tab order, arrow-key navigation with wraparound, and Home/End support. Tab navigation stops propagation so ArrowRight does not also advance the existing point-by-point demonstration.

Tools is labeled Data tools, and Inquiry is labeled Sampling effects. The five activities remain visible in a responsive grid with wrapping labels and 44-pixel minimum heights. Each active panel has an accessible name tied to its tab and can receive keyboard focus.

The four regression-model buttons now expose their selected state through aria-pressed, sit in a named Regression model group, and have larger touch targets. Linear, quadratic, exponential, and logarithmic models remain available. Existing model calculations, datasets, chart types, import/export tools, quizzes, and sampling investigations are unchanged.

## Verification

- 62 tests passed across chart/regression engine and shared activity-selector semantics suites, including six added checks for all five new panel links and restored model selection.
- Browser verification opened all five activities and selected all four models in default, dark, and high-contrast themes. Model and activity changes preserved the points.
- Verified Home, End, and ArrowRight navigation, including unchanged stepIdx while the point-by-point demonstration was enabled.
- The navigation fits 1120, 375, and 320 pixels in all three themes: nine viewport checks. Buttons meet the 44-pixel minimum, increased navigation text spacing does not overflow, and no browser runtime errors occurred.
- The narrow navigation was visually reviewed. Source/public mirrors match, catalog JSON parses, and scoped diff whitespace checks pass.

Evidence and reusable browser verification are in scratch/regression-ui-clarity-2026-09-19/. Browser checks use mocked host context; this is not a full deployed-application audit. Changes remain local; no deployment was made.
