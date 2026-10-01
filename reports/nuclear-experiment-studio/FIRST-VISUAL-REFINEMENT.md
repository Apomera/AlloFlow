# Guided discovery visual refinement

Verified October 1, 2026.

The first distance experiment now has clearer source and detector housings, a more prominent saved reading, fraction cues on prediction choices, and quarter divisions on the comparison bars. The current step has a filled badge and a stronger border. The evidence view uses a segmented control for saved readings and the original prediction.

These are presentation changes. Moving the detector still changes only its position. The saved reading stays at 100% until the learner takes the 2 m reading, which records 25%. Prediction, grading, completion, navigation, and saved work retain their existing behavior. No translation strings were added.

## Verification

- **157 behavior tests passed**, including experiment state, saved observations, navigation, and translation coverage. Results: `first-visual-unit.json`.
- **11 Chromium guide checks passed**, with one worker and no retries. They cover the original guide, movement, prediction review, and the new visuals. Results: `first-visual-browser-complete.json`.
- Mobile checks cover 320px and 390px widths, larger text, reduced motion, keyboard use, and forced colors. Prediction choices retain at least 44px touch targets. The detector diagram, saved reading, next measurement action, and evidence chart remain visible during their respective steps. There is no horizontal overflow.
- Axe checks passed for WCAG 2 A/AA and WCAG 2.1 AA at the tested stages. Screenshots were also reviewed; this found and corrected a forced-color text backplate that made the selected comparison label unreadable.
- Three deliberate visual mutations were rejected: a 100% half prediction cue instead of 50%; a first quarter marker at 20% instead of 25%; and a detector housing centered at 130 instead of 205 after moving to 2 m. Production source was unchanged by these isolated checks. Logs: `mutation-first-visual-guess.txt`, `mutation-first-visual-scale.txt`, and `mutation-first-visual-body.txt`.
- Static checks confirm that all four module copies match, all 501 active keys match the four registries, and the production loader references the module. The original lesson outside the studio remains unchanged.
- Comparison with `first-visual-before.js` confirms that the guide's measurement, prediction, grading, focus, and navigation logic are unchanged. Eight other helpers/components and all original CSS are preserved. The preservation checks reject deliberate model, evidence, loader, mirror, registry, and external-source drift.

An initial browser check caught prediction cards extending below the 320px viewport. Mobile header spacing was tightened before the successful final run. Earlier failure reports remain available.

## Screenshots

- `first-visual-desktop-start.png`: fraction cues and current step.
- `first-visual-desktop-apparatus.png`: detector moved while the saved reading stays at 1 m.
- `first-visual-desktop-evidence.png`: 100% and 25% on the shared quarter scale.
- `first-visual-mobile-start-320.png`: larger text and prediction choices.
- `first-visual-mobile-apparatus-320.png`: saved reading and visible action.
- `first-visual-mobile-forced-320.png`: apparatus and keyboard focus in system colors.
- `first-visual-mobile-evidence-forced-390.png`: readable selected comparison and divided evidence bars.

Both tracked module copies, the browser spec, and this report are the scope of the visual commit. The translation registries retain their existing shared edits.
