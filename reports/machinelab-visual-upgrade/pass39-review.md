# Machine Lab pass 39: prediction feedback

The Prove it area now presents feedback in a bordered card with a check or retry icon and a readable status message. Submitted numeric answers include a three-step load ÷ mechanical advantage calculation. Rounded effort is marked with an approximation symbol. Blank answers and the youngest learners' multiple-choice responses keep simple feedback.

Editing a numeric answer clears the previous result, so an old success or retry message cannot appear to validate the new draft answer. Previously earned station progress is retained.

Validation: 228 UI regression tests and 246 Chromium browser checks passed. Browser checks cover all six mechanisms at 1150, 390, and 320 pixels, correct and incorrect numeric submissions, clearing feedback on edits, blank input, additional reading levels, young-learner choices, and system high contrast across three themes. Captured 36 screenshots. Source/desktop parity, syntax, and scoped diff checks passed.

An initial screenshot-only timeout was fixed by following the result card rather than a heading whose text changes after success. The final light run passed.

- [Phone result and calculation](pass39-light-final/proof-windlass-320.png)
- [Young learner feedback in dark mode](pass39-dark/proof-choice-320.png)
- [System high contrast](pass39-contrast/proof-forced-colors.png)
- [Validation details](pass39-summary.json)

Changes remain local. No commit, push, or deployment was performed.
