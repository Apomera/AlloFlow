# Money Math: learner-paced cashier practice

Local enhancement completed September 19, 2026.

## Learning experience

The Grocery Store now offers **Practice at your pace** alongside the existing scored cashier shift. Practice has three starting points: adding item costs, adding model tax, and applying a coupon before tax. There is no timer or speed score. Tax exercises explicitly use an 8% activity model rather than implying a real jurisdiction's tax rules.

Receipts initially show the facts needed to solve the problem: quantities or weights, unit prices, coupon conditions, and tax. Incorrect answers give directional feedback and remain editable without revealing the total. Learners can request one working step at a time or the complete working. Returning to an earlier step does not erase the record of support. Independent completion earns 10 XP once; supported completion is acknowledged without independent-completion XP. Practice does not change scored-shift results.

Working connects each multiplication to its rounded item cost, then explains the subtotal, amount retained after a coupon, tax on that amount, and final sum. The approximation sign identifies operations that round. An addition receipt has a stacked item-cost diagram and exact sum. Coupon/tax receipts have two strips on the same monetary scale, with labeled removed, retained, and tax amounts. Numeric equations and legends accompany the colors; a zero-total receipt gets a plain explanation instead of a meaningless graph. Reflection prompts encourage a second grouping strategy or reasoning about the coupon's effect on tax.

## Interaction and robustness

Inputs validate blank, negative, invalid, out-of-range, and excess-precision amounts. Currency and grade changes close the active receipt so old amounts cannot be reinterpreted in a new context. A new receipt resets the answer, working, and feedback. Invalid restored receipts provide a recovery action. Calculations are rebuilt from item facts rather than trusting saved totals.

Receipt arithmetic uses integer cents or whole yen, with each weighted line rounded before addition. Percentage coupons round the retained amount; flat coupons stop at the subtotal and explain unused value. Generation samples without replacement and accommodates a one-item catalog; an empty catalog restores the default catalog and setup. Receipt context includes its currency.

Controls wrap on small screens, use readable light/dark/high-contrast surfaces, and support keyboard operation. Completed answers become read-only while retaining focus; Tab proceeds to the next receipt action. Enter during IME composition does not submit an answer.

## Verification

- **200 tests passed across seven focused suites**, including **54 new cashier tests**. Coverage includes rounding and receipt reconciliation, all eight currencies, invalid inputs and restored data, support and one-time rewards, catalog edge cases, context changes, keyboard completion, and access to the scored shift. An initial incomplete fork-worker run timed out during worker shutdown; the complete single-worker thread run passed with exit code 0.
- **39 distinct browser states** were checked across light, dark, and high-contrast themes. The initial sweep covered 36 states; a final nine-state sweep added the three addition diagrams and repeated receipt/completion checks after the final refinements. All recorded checks had no browser errors or automated WCAG A/AA violations, no horizontal overflow at 320 pixels, and no overflow with increased text spacing. The final sweep also verified explicit dark/contrast surfaces and three keyboard workflows, including focus after completion and Tab to the next receipt.
- Phone screenshots of complete working, the addition diagram, and high-contrast working were inspected. Source/public byte parity, JavaScript syntax, all **62 scoped English labels**, and scoped whitespace checks passed. Evidence is in `scratch/money-cashier-2026-09-19/`; `verification.json` records the aggregate results.

Browser checks use the real component and application styles with local React and simulated host callbacks. They do not establish deployed-app integration, every possible saved state, or classroom learning outcomes. Other languages retain the existing translation fallback behavior.

Application changes are confined to `stem_lab/stem_tool_money.js`, its public mirror, and scoped keys in both English registries. New regression coverage is in `tests/money_math_cashier_practice.test.js`.

No staging, commit, push, or deployment was performed. Unrelated workspace changes were preserved.
