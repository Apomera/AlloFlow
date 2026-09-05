# Basic math refinements: second pass

Continued the [first refinement pass](basic-math-refinements-2026-09-04.md) with four of the remaining instructional improvements.

| Tool | New behavior |
|---|---|
| Unit Converter | An optional prediction mode asks whether the numerical value will become larger, smaller, or stay the same. The result, equation, result bars, reference answer, and saved examples wait until the learner chooses and checks a prediction. Feedback explains the connection to unit size. Changing the quantity or units starts a fresh prediction. Zero and equal-sized units receive their own explanations. |
| Money Math | Learners can save a set of coins/bills and build another set on the counting board. Both representations remain visible for comparison. The feedback distinguishes equal value with different denominations, a rearrangement of the same denominations, and unequal totals. Comparison uses integer currency units and keeps currencies separate. Clearing the board preserves the saved comparison set. |
| Ratios, Rates & Proportions | Practice double number lines now align the problem's known and unknown quantities on a shared scale. The whole diagram fits on a phone. Scaling cards apply the same multiplication or division to both ratio terms, while requested answers remain blank. Expanded model tables have explicit colors for dark-theme readability. |
| Multiplication Table | Untimed practice retains feedback and fact-family explanations until “Next question.” Speed runs retain automatic progression. Pausing or ending a run cancels pending progression; leaving the tool cleans up its advance timer. Feedback uses a live status region. |

Conversion prediction currently supports valid zero/positive quantities outside the temperature category. Temperature and negative-value conversions keep their usual behavior and explain the prediction activity's scope. New interface text is registered with the existing English fallback system.

## Verification

- Added 12 behavioral tests in `tests/basic_math_reasoning_flows.test.js`, covering disclosure, changed inputs, zero/equal units, incorrect predictions, money equivalence and currency changes, timed/untimed/paused progression, and alignment without answer disclosure.
- Existing regression pass: 86 tests passed across the four tools and related first-pass/temperature tests.
- Final focused passes: 26 pacing/engine/accessibility tests and 35 reasoning/ratio tests passed. Counts overlap because affected suites were rerun after refinements.
- Broader accessibility pass: 39 tests passed initially; three interrupted browser cases passed on focused retry.
- Captured and audited 18 activity/theme combinations at desktop and phone sizes, with accessibility and page-reflow checks at 320px. Two expanded ratio states exposed dark-theme contrast problems; all six ratio/theme combinations passed after the fix. No runtime errors or page overflow were found in those captures.
- Checked JavaScript parsing, root/public module parity, and scoped whitespace checks.

The browser harness uses the local modules and stubs external services. These checks do not establish classroom learning outcomes or replace observed learner testing. No deployment or broad application build was performed.

## Screenshots and evidence

- [Prediction before reveal, phone](../scratch/basic-math-pass2/prediction-hidden-default-mobile.jpg)
- [Prediction feedback, phone](../scratch/basic-math-pass2/prediction-revealed-default-mobile.jpg)
- [Equivalent money sets, phone](../scratch/basic-math-pass2/equivalent-sets-default-mobile.jpg)
- [Aligned ratio quantities, phone](../scratch/basic-math-pass2/double-line-default-mobile.jpg)
- [Ratio scaling cards, phone](../scratch/basic-math-pass2/scaling-default-mobile.jpg)
- [Learner-paced multiplication feedback, phone](../scratch/basic-math-pass2/feedback-default-mobile.jpg)
- [Initial activity/theme audit](../scratch/basic-math-pass2/browser-results.json), [resolved ratio rechecks](../scratch/basic-math-pass2/ratio-recheck.json)

Changes are in the Unit Converter, Money Math, Multiplication Table, and Ratio Lab source modules and their public copies, plus the English strings and focused tests. Unrelated workspace changes were preserved.
