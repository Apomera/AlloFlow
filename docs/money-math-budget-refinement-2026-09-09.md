# Money Math: budget tradeoffs and allocation visuals

Local follow-up completed September 9, 2026, after the full Money Math review.

## What changed

The Budget Planner now measures allocations against a fixed reference: each complete strip represents 100% of one income. An allocation of 125% fills one strip and one quarter of a second strip. The previous chart compressed every overallocated plan into a single full strip, concealing how much the plan exceeded its income. Numbered color keys, full category names, percentages, currency amounts, and a plain-text balance equation accompany the visual. Underallocation leaves visible space, and excess amounts are described positively rather than as negative remaining percentages.

Learners can move percentage points between two categories while preserving the total allocation. A preview shows both changes before applying them. The explanation connects percentage points to the whole income, and the separate slider section clearly identifies the controls that change the overall total. Each slider now covers 0–100% and announces its percentage and currency amount.

The first transfer saves a reference plan automatically. Learners can also save, replace, and clear the reference explicitly. Comparison cards show saved and current shares, money amounts, signed changes, and the allocation totals. Changing income retains the reference and explains why the money can change without a percentage change. Changing currency clears the reference. Transfers are exploratory and do not award XP or call AI.

All budget amounts use integer cents or yen. Each category is initially rounded down; remaining units go to the largest fractional remainders, with ties following category order. Category amounts sum to the rounded allocation total, including tiny incomes, and the planner explains this rounding rule when it is needed. Expense availability uses the same displayed category amounts. Zero-cost expenses cannot be drawn or rewarded; restored expenses that round to zero require a larger income before a response can be chosen. The former qualitative buffer badge was removed from the monthly totals so an overallocated plan does not receive an encouraging buffer assessment.

Income fields preserve incomplete or invalid drafts and display currency-specific guidance. Stale charts, comparisons, and expense controls are withheld until the input is valid. Whole-yen and two-decimal currencies follow their respective precision rules; the supported income range is 0–1,000,000. Valid restored drafts agree with the calculations and are committed on blur. Merely leaving an unchanged income field preserves completed expense feedback. Saved category arrays are bounded and normalized to prevent malformed restored data from crashing the planner.

## Verification

- 146 tests passed across six focused Money Math/basic-math suites, including 47 new budget checks. Coverage includes exact allocation sums, strip geometry, invalid inputs, transfer conservation, reference lifecycle, currency changes, event-feedback resets, and zero-cost reward guards.
- 36 distinct browser states were checked across light, dark, and high-contrast themes. Twenty-one follow-up browser checks cover the final visual, input, tiny-income, and theme refinements. The checks include runtime errors, automated WCAG A/AA, 320-pixel reflow, increased text spacing, and three keyboard workflows.
- Phone screenshots were inspected directly. This caught yellow text on pale gradients that the automated contrast scan missed. Budget and expense panels now use explicit dark/high-contrast surfaces, verified through computed-style assertions and new screenshots. Eight exposed dark-theme labels were also corrected, including the expense-history heading and count. Initial failing scans are retained beside the corrected runs. The final evidence and aggregate verification are in `scratch/money-budget-2026-09-09/`.
- Source/public byte parity, JavaScript syntax, scoped English-label parity, and scoped whitespace checks passed.

These checks use the real component and application styles with local React and simulated host callbacks. They do not establish deployed-app integration, every possible saved state, or classroom learning outcomes. Other languages retain the existing translation fallback behavior; 36 English keys were added for this pass.

Changed application files: `stem_lab/stem_tool_money.js`, its public copy, and scoped keys in both English string registries. Added regression coverage: `tests/money_math_budget_learning.test.js`.

No staging, commit, push, or deployment was performed. Unrelated workspace changes were preserved.
