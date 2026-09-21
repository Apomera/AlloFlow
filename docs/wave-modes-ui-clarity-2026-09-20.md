# Wave Lab experiment choices — September 20, 2026

All seven wave modes now have concise visible descriptions explaining what learners can explore. The experiment choices form a named group, expose the selected mode with aria-pressed, and connect each button to its description. Responsive cards provide minimum 44-pixel targets and wrap text on narrow screens. Existing mode names, actions, narration, and separate playback controls remain available.

## Verification

- 21 relevant wave tests passed.
- Browser checks covered all seven mode selections with Enter, plus Space activation, in default, dark, and high-contrast themes.
- Switching modes preserved frequency, amplitude, physical wave speed, and paused state. Exactly one mode was marked selected, with a linked description for each choice.
- Layout and target-size checks passed at 1120, 375, and 320 pixels in each theme (nine viewport/theme combinations), including increased text spacing. The phone-width choices were visually inspected.
- No browser runtime errors. Source/public mirrors match; catalog JSON, JavaScript syntax, and scoped whitespace checks passed.

Evidence: scratch/wave-modes-ui-2026-09-20/. The browser harness uses mocked host context with real React, tool modules, and application styles; this is not a full deployed-app audit. Changes remain local; no deployment was made.
