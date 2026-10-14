# Machine Lab: clearer power and motion readouts

The optional Explore power, motion and pace panel now organizes its existing values into named groups: Power transfer, Motion and task time, and Handle rotation when the machine has a rotating handle.

Average input power occupies a full-width card with a larger value and a contrasting top border. Useful and lost power sit together beneath it. Movement rates share a row, followed by a full-width time-at-budget card. Rotary quantities remain in their original order in a separate group. Narrow screens stack the cards; numeric text can wrap without truncation.

All existing labels, values, units and reading order are preserved. Only `comparison()` changed. Calculation models, grading, inputs, navigation, practice and records are unchanged; source and public mirror match.

Baseline: `0315720a5`. Reviewed source SHA-256: `7b62f6befb82aee628688dd76dae6091ccd949757bc542269cdc4a465e747867`.

## Verification

54 selected existing tests passed: 18 metric/rotation/pace cases, 28 accessibility checks and eight translation-hygiene checks. The three native test processes and their wrapper exited successfully. No new unit tests were added for this rendering change.

The browser harness uses actual React/THREE and independently derived metric expectations across six machines. It checks group names and definitions, preserved reading order, responsive geometry, readable contrast, keyboard navigation and state preservation. Screenshots compare the previous desktop layout with the new desktop and rotary layouts, plus dark, forced-color and enlarged-text phone layouts.

The final browser run passed 573 checks across ten mounts and six bench routes. All six screenshots were independently inspected by root and the browser reviewer. Both native and wrapper processes exited successfully; no failed test or browser runs were needed in this pass.

Final results are recorded in `validation-summary.json`. `verify-scope.cjs` proves that only the comparison renderer changed; `verify-evidence.cjs` binds the test and browser results to the reviewed source and screenshots.

This is a local change; no push or deployment. Browser checks use local Chromium and software WebGL. Forced colors and text enlargement are simulations, not a physical assistive technology session or a deployed host build.
