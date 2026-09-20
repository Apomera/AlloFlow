# Time & Schedule UI clarity — September 19, 2026

## Changes

The Clock Link view keeps its live 12/24-hour comparison visible while moving the repeated conversion cards and explanation into a native expandable guide, How 12- and 24-hour time match. All teaching content remains available with mouse or keyboard, without changing lesson state.

Time-format selectors and all six clock-adjustment buttons now have minimum heights of 44 pixels. The format selector can wrap. Browser verification also identified and fixed a four-pixel activity-navigation overflow at 320 pixels in dark mode by allowing the button and inner label to shrink and wrap.

Existing time calculations, exact-time entry, minute-hand controls, elapsed-time lessons, schedule activities, challenges, scores, and keyboard navigation are preserved. Ratio Lab was reviewed and left unchanged because its activity navigation already provides descriptive choices and adequate targets.

## Verification

- 39 tests passed across the time engine and Time & Schedule lesson suites.
- Browser checks covered all four activities in default, dark, and high-contrast themes at 1120, 375, and 320 pixels: nine viewport/theme combinations.
- Verified keyboard expansion/collapse without changes to lesson state; switching to 24-hour display preserved 23:55; adding five minutes produced 00:00 with the midnight conversion explanation.
- Format and adjustment buttons meet the 44-pixel minimum. Navigation and control groups fit their containers, including increased navigation text spacing. The final browser run passed after fixing the measured dark-mode overflow.
- The expanded narrow-screen guide was visually inspected. No browser runtime errors occurred. Source/public mirrors match, catalog JSON parses, and scoped diff whitespace checks pass.

Evidence is in scratch/time-ui-clarity-2026-09-19/. The browser harness uses mocked host context; this was not a full deployed-app audit. Changes remain local; no deployment was made.
