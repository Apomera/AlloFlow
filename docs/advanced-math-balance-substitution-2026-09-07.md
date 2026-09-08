# Advanced Math follow-up: testing values on the algebra balance

Completed September 8, 2026 (started September 7). This pass adds a substitution investigation to Algebra CAS's Scale view.

## Learning and interaction improvements

The scale previously displayed a level beam for the equation without a way to test a particular value of x. The view now explains that the beam represents the goal of equal sides and offers an optional **Test a value for x** panel.

Learners predict whether the sides will match, then enter an integer, decimal, or fraction. The tool substitutes the same value for every x, displays each calculation, and reports the exact difference between the sides. A solution has a difference of zero. The check runs locally using the balance engine's rational arithmetic, so a tiny nonzero difference cannot round into a false claim of equality.

Two linked number-line rows place the left and right values on the same scale. A square and a circle distinguish the sides without relying on color. Signed values retain their mathematical positions, and the exact text calculations provide the diagram's accessible equivalent. The activity explains that the diagram rescales for the current values and uses approximate positions.

**Test x − 1** and **Test x + 1** support nearby comparisons, including exact fractional steps. After a reversible balance operation, the panel checks the same x against both the previous and current equations. It shows why a solution remains a solution, why an unsuccessful trial remains unsuccessful, and why multiplication or division by a negative constant can reverse which side is larger while preserving equality.

Identities and contradictions receive explanations derived from their exact coefficients and constants. One successful example is not presented as proof that every x works. Unsupported equations, invalid values, and zero denominators receive guidance without displaying a solution claim.

Typing a new trial or editing the equation clears stale results. A completed check survives collapsing the panel and can resume from saved tool state. Checking values does not award XP or invoke AI; existing operation-based scoring remains in place. The controls wrap on phones and retain keyboard focus through repeated checks.

## Verification

- All **74 focused tests** passed across five suites and completed runs, including **31 new arithmetic and interaction cases**.
- All **42 distinct activity/theme browser states** passed runtime, automated WCAG checks, 320 px reflow, and expanded text-spacing checks. Coverage includes default, dark, and high-contrast themes.
- All **three keyboard workflows** passed opening/collapsing, Enter-to-check, balance operations, neighboring-value checks, invalid input, and stale-result clearing.
- Phone and desktop screenshots were inspected. Function syntax, source/public byte parity, all **27 new English strings**, and scoped whitespace checks passed.

The combined rerun reported 72 passing assertions and exited before reporting the canvas suite. A separate canvas run passed both remaining checks. The browser sweep also needed a targeted rerun after a loading timeout. Original runner reports and rechecks are preserved; the consolidated verification covers all five test suites and all 42 browser states.

The regression suite is `tests/advanced_math_balance_trial.test.js`. Evidence and reproducible scripts are in `scratch/advanced-math-balance-trial-2026-09-07/`, with final counts consolidated in `verification.json`.

## Scope and limitations

The check supports the same linear-in-x expressions as the local balance engine. Trial inputs are signed integers, decimals, or fractions with a nonzero denominator. Nonlinear equations remain in the existing Solve workflow.

The number-line positions are approximate, even when two distinct exact values appear at the same position. Values outside the diagram's numerical range retain their exact textual results and receive an explanation in place of the plot. A diagram alone is not used to establish equality.

Browser checks mount the actual tool with application styles and English strings in a local harness. They do not establish classroom learning outcomes or deployed AI-provider behavior. No broad build, staging, commit, or deployment was performed; unrelated workspace changes were preserved.
