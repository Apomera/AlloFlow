# Basic math: comparison and strategy refinements

This fourth pass focuses on Fraction Lab and Multiplication Table, following the broader review and three implementation passes.

## Fraction Lab

- **Improper fractions keep their whole units.** The comparison view now draws complete equal-sized bars or circles and a remainder, so 7/4 no longer looks like 4/4. Large quantities show a bounded set of whole models with an explicit count of additional wholes. Negative values carried over from Operations show their magnitude with a sign explanation and their signed position on the number line.
- **Both fractions remain visible on phones.** Larger unit models, stacked input cards, and a fitted number line replace the compressed comparison layout. A circle and a diamond identify A and B; separate labels remain readable when the values are equal. The two model buttons now have accurate accessible names and selected states.
- **Explanations connect to equal-sized parts.** A disclosure rewrites both fractions with a common denominator before connecting those counts to cross-products. The introduction emphasizes equal wholes and magnitude. Exact comparisons use integer cross-products; rounded differences display an approximation marker.
- **Quiz questions no longer reveal the explicit solution prematurely.** The common-denominator explanation and comparison result remain hidden until a choice. Models stay available as reasoning supports. Equivalent fractions can now be the correct answer; equality feedback no longer says that an equal fraction “is larger.” Editing an operand or selecting a preset exits the old question, and rapid duplicate activations cannot award the same round twice. Inputs enforce their declared bounds.

## Multiplication Table

- Untimed answer feedback offers an optional **Build this fact from smaller facts** activity. Learners choose a row split, inspect the two colored dot groups, and connect them to a distributive equation.
- Changing the split conserves the number of dots and does not count as another scored answer. Division questions use the divisor as the number of equal groups and connect back to the related multiplication fact. One-row cases correctly include a zero-sized second group.
- The activity remains available until the learner advances. Speed Run retains its existing pacing. The incorrect-answer announcement now matches the actual feedback flow instead of asking for a retry after the input has been locked.
- Disclosure headings in both tools now remain readable under the full application high-contrast theme.

## Verification and scope

Final validation: the broader eight-suite run covered 83 tests, with 82 passing and one rounded-difference assertion exposing the remaining less-than branch. After correcting it, all 13 dedicated interaction tests passed. All 21 activity/theme cases passed the final browser audit, followed by three clean notation/layout rechecks. Final syntax, source/public equality, and scoped whitespace checks passed. Results: `final-tests.json`, `final-focused-tests.json`, `final-browser-results.json`, and `notation-browser-results.json` in the evidence folder.

The new behavior has dedicated interaction tests in `tests/basic_math_comparison_strategies.test.js`. Browser fixtures use the actual application stylesheet, local React and tool modules, English strings, and Chromium. They cover desktop and phone rendering, 320-pixel page reflow, and automated WCAG A/AA checks. Screenshots were also inspected directly; automated checks alone did not establish model readability.

Evidence, initial findings, final results, and reproducible scripts are under `scratch/basic-math-pass4/`. Source snapshots from before this pass are retained there. Early test failures exposed incomplete fixture navigation, canvas support, and host-score initialization; those fixtures were corrected before final verification.

Root and desktop public copies are synchronized, and new English copy is registered. This is a component-level refinement and validation pass, not a production deployment or a measured learner-outcome study. No broad build, staging, commit, or deployment was performed; unrelated concurrent changes were preserved.
