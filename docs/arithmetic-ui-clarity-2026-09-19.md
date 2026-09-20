# Arithmetic Studio UI clarity — September 19, 2026

Practice levels now show an example from the actual problem bank for the selected operation. Foundations, Multi-digit, and Challenge remain available; examples show no answers. The heading occupies its own row, and the level cards stack on narrow screens so examples stay readable.

Reselecting the active level preserves the learner's answer, estimate, feedback, and hint. Changing levels still starts fresh practice. Activity tabs, operation selectors, and level buttons have minimum 44-pixel heights and wrapping text. No activities or calculations were removed.

## Verification

- 42 arithmetic strategy and engine tests passed, including a new regression covering preserved work and reset behavior when changing levels.
- Component browser checks passed in default, dark, and high-contrast themes at 1120, 375, and 320 pixels (nine viewport/theme combinations).
- Checked all twelve operation/level combinations in each theme, keyboard reactivation with preserved state, cleared answers after changing levels, all four activity tabs, and Home/End/arrow navigation.
- Navigation, operation selectors, and difficulty controls fit their containers with 44-pixel minimum targets. Increased text spacing was checked, and the final narrow-screen level cards were visually inspected.
- No browser runtime errors. JavaScript syntax, catalog JSON, source/public equality, and scoped whitespace checks passed.

Evidence: scratch/arithmetic-ui-clarity-2026-09-19/. Browser verification uses a mocked host context with real tool modules, React, and application styles; it is not a full deployed-app audit. Changes remain local and have not been deployed.
