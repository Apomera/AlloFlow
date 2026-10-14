# Machine Lab: connect power budgets to task pace

The revealed or correct power-budget result now includes “Choose a workable pace.” Two time cards and bars compare the current duration with the duration at full budget. The multiplier and worked equations connect required power, available power, energy and task time. All six machines use the existing energy model.

Learners can open the existing “Time at this budget” calculation directly. Switching skills clears the unsaved calculation draft, as described beside the button. Continuing an already selected time calculation preserves its answer, hints and state. Saved records remain available. The shortcut validates the latest bench, task signature and disclosed result before changing state, then checks the rendered destination before moving focus.

The layout stacks on phones, uses solid and patterned bars, and supports keyboard focus and forced colors. Near ties keep sufficient numerical precision to avoid displaying distinct durations as equal. Computed durations are not clamped to the editable input range. The explanation identifies the fixed work and efficiency assumption and the limits of an energy and average-power comparison.

## Scope and validation

Baseline: `dea24fa02`. Reviewed source and public mirror SHA-256: `5a8b2a49887866acfac8e85ea3e9d94370e576233aa17074436d85b58f649231`.

`verify-scope.cjs` checks source/mirror parity and syntax, and proves that only the existing budget practice renderer and the new pace navigation helper differ from the baseline. Existing physical calculations, prediction practice, ordinary calculation handlers and record formats are unchanged.

Validation results are recorded in `validation-summary.json`. Native test receipts, logs and exact-once test inventory are under `tests/`; the actual React/THREE browser results and screenshots are under `browser/`. `verify-evidence.cjs` verifies hashes, process outcomes and coverage against the frozen source.

- 107 tests passed exactly once in 13 serial native groups: 21 new cases and 86 unchanged regressions across five files.
- 1,331 native browser checks passed across 18 machine/budget combinations, including all 18 pace comparisons and 12 skill-navigation flows.
- 23 keyboard-focus checks passed. Four final screenshots cover pending and checked desktop practice, a dark narrow phone and a forced-colors narrow phone; root and the browser reviewer independently inspected them.
- Source-scope proof, evidence verification and JavaScript syntax checks passed. Test and browser wrapper/native processes exited successfully, with no failed native attempts in this pass.

This is a local workspace improvement. Native browser checks use local Chromium with software WebGL; no deployed host build or physical assistive technology session is covered. No deployment or push was performed.
