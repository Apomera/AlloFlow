# Solution comparison predictions - September 12, 2026

The solution concentration explorer now includes optional prediction practice. After recording a mixed preparation, open **Explore volume and concentration**, then enable **Predict before revealing**. Choose the 25 mL portion or either whole-sample dilution example.

## Student interaction

The recorded 100 mL solution remains visible as the reference. The result diagram, numerical result, equation, and explanatory conclusion are absent until the student checks a prediction or selects **Show comparison**. The legend remains visible to explain the original diagram's volume tiles and schematic solute symbols.

Two separate questions ask whether **solute mass** and **mass concentration** will be lower, the same, or higher than in the recorded solution. Neither question starts with an answer selected. **Check prediction** becomes available after both have valid answers.

Checking reveals the comparison and gives independent feedback for each idea. A student can correctly predict conserved solute mass during dilution while still needing to reconsider its concentration. Feedback retains the student's chosen answer and states the result in words; it does not rely on color or present a combined grade. The paired diagrams align at the top of the comparison, with feedback beneath the result card. The equation and explanation connect the quantities.

For an aliquot, the expected predictions are lower solute mass and unchanged concentration. For either whole-sample dilution, solute mass stays the same and concentration decreases. These outcomes use the same supported scenarios as the [solution comparison](titration-solution-comparison-2026-09-12.md), whose notes describe the model and content references.

**Show comparison** reveals the example without answering or producing correctness feedback. **Try this prediction again** clears both answers and hides the result. Turning prediction mode off restores the normal comparison immediately.

## State and accessibility

- Changing examples clears the prior prediction and hides the new result while prediction mode stays enabled.
- Closing and reopening the explorer retains the chosen example and prediction-mode preference but starts a fresh unanswered prediction.
- Returning to the activity or changing to a different recorded preparation restores the existing closed explorer and normal comparison default.
- Upstream transfer changes preserve the recorded preparation's own sample, consistent with the existing workflow.
- Predictions and feedback stay in the mounted component. They do not create grades, save answers, consume solution, or modify lab records or live titration data.

Native radio groups support keyboard navigation and have separate solute-mass and concentration legends. After checking or explicitly revealing, focus moves to the feedback. Retrying focuses the first solute-mass choice without selecting it. Escape closes the explorer and returns focus to its disclosure control. Feedback uses explicit text and visible boundaries in forced-colors mode. No animation or external dependency was added.

## Verification

**207 tests passed across 14 suites** in `reports/chemistry-refinement-2026-09-06/titration-solution-prediction-final-tests.json`. An earlier run had a worker-startup timeout before the remaining-tabs suite could run; the final rerun completed all suites without errors. The new unit suite checks both expected outcomes, all answer combinations, incomplete or malformed answers, immutable inputs, supported sample sizes including tiny samples, preparation completion gates, and consistency with the comparison calculations.

**28 scoped browser accessibility/layout scans passed**, with no scoped axe violations, horizontal overflow, or page errors: 14 prediction scans and 14 original comparison scans at desktop and phone widths. Final screenshots were visually inspected, including aligned result cards, narrow-screen controls, separate feedback, and forced colors. Source syntax, exact source/public equality, all 419 unique equipment-helper English keys, and scoped whitespace checks passed.

The new browser harness exercises concealed results, both-correct and both-incorrect answers, partially correct dilution answers, optional reveal, scenario changes, retry and Escape focus, turning prediction mode off and on, reopening the activity, retained and changed sources, tiny values, malformed state, and preservation of live chemistry. It scans desktop 1200 px and phone 320 px layouts. The original comparison harness is also rerun to check the default experience.

Run `node reports/chemistry-refinement-2026-09-06/titration-solution-prediction-browser.cjs` and `node reports/chemistry-refinement-2026-09-06/titration-solution-comparison-browser.cjs`. Their reports and screenshots use the corresponding prefixes. Vitest uses `--pool=threads --maxWorkers=1`.

There are **17 new English strings** in this pass. Other-language translations remain pending. Changes are local and have not been deployed or tested in a physical-device classroom trial.
