# Statistics and Angles UI clarity — September 19, 2026

Statistics Lab now uses task-oriented activity labels: Sample datasets, Choose a test, Data, Run a test, Results, Power & sample size, Quiz progress, and Explore test power. Its responsive activity grid has wrapping labels and 44-pixel minimum buttons. The final grid keeps two columns in the narrow component preview, avoiding a long stack of eight buttons.

Angle Explorer's four activities now fit a two-column grid instead of requiring horizontal scrolling. Labels identify Measure angles, Challenges, Angle relationships, and Bisector & calculator. Buttons wrap and have 44-pixel minimum heights.

All existing activities, tab IDs, saved-state keys, keyboard navigation, datasets, and calculations remain unchanged. English labels were added to both catalogs; other locales use the existing fallback mechanism. Probability was inspected briefly and left unchanged in this bounded pass.

## Verification

- 20 existing tests passed in six suites: Angles tab/graph accessibility and Statistics tab/form accessibility, contrast, and inquiry pedagogy.
- All 12 activities opened with correctly associated panels in default, dark, and high-contrast themes. Home, End, and ArrowRight focus/selection checks passed.
- Initial browser checks covered 18 tool/theme/viewport combinations at 1120, 375, and 320 pixels. After visual review, Statistics alone was refined and rechecked at all nine combinations.
- No selector overflow under increased text spacing; every navigation button is at least 44 pixels high. No browser runtime errors occurred.
- Source/public tool and translation mirrors match; the translation catalog parses successfully.

Browser checks use the existing component harness with mocked host context. They do not constitute a full application or statistical-engine audit. Evidence and reusable verification script are in scratch/statistics-angles-ui-2026-09-19/. Changes remain local; no deployment was performed.
