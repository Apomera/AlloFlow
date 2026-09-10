# Money Math deep review and enhancements

Reviewed September 9, 2026. This pass covers the ten Money Math sections and all five Personal Finance subviews, with deeper implementation work in Making Change, Tips & Discounts, Compound Inquiry, and form accessibility.

## Main improvements

### Making change: build, revise, and explain

Learners can enter an amount or build a tray of coins and bills. The tray shows its total and the price-plus-tray equation, supports undo and clearing, and accepts any valid combination. It does not force the fewest-piece solution. Incorrect answers indicate too little or too much change without revealing the result. Blank, negative, and overprecise currency amounts receive guidance. The studio overview also withholds the answer, and legacy wrong-answer messages cannot expose an old solution.

A learner-paced count-up guide moves from the price through friendly whole amounts toward the payment. For $3.65 paid with $10, it shows $0.35 to reach $4, $1 to reach $5, and $5 to reach $10. The progress bar shares the price/payment endpoints and fills in proportion to the amount added. Only reached steps appear in the working and live status. Previous, next, and a complete worked solution are available. The finished solution checks both subtraction and addition and lists one possible cash combination.

Opening worked support marks that problem as supported practice; subsequent completion does not generate an independent-success XP award. Typed and tray answers share the existing once-per-round reward guard. Changing the problem or currency clears the guide and tray. Restored state is tied to the currency, problem, and round. Exact payment, a zero-price problem, and invalid saved underpayments have explicit behavior. Cash combinations use integer minor units and the selected currency's available denominations. The tray is bounded at 100 pieces with a visible explanation.

### Tips and discounts: connect percentages to money

Optional worked models connect 100% of the original amount to the percentage part and remaining percentage. Wrong attempts retain the opportunity to revise; learners can explicitly request supported working. Tip calculations show the rounded tip, bill-plus-tip total, and division by diners. Per-person rounded amounts use an approximation sign.

An exact payment split accounts for leftover cents or yen. For a ¥1,150 total split three ways, the rounded share is approximately ¥383, while two people paying ¥383 and one paying ¥384 sum to the total exactly. The model distinguishes accounting amounts from available cash denominations. Exact splits, zero totals, and currency rounding are covered by tests.

Discount working applies the retained percentage to the original price, rounds that sale price, and then applies the coupon. It replaces the invalid expression “money − percentage” with multiplication by the retained fraction. Percentage savings, applied coupon, and final price add back to the original price. A coupon larger than the remaining price is capped at that price; both feedback and working use the applied amount and explain why there is no money back. Half-cent cases follow the existing retained-price rounding rule.

### Compound Inquiry and accessible controls

Inquiry values and input labels now follow the selected currency. Scenario records retain the currency in which they were recorded; legacy records remain identified as USD. Partial restored state and zero contributions are handled without non-finite graph geometry. Zero contributions no longer imply a meaningful balance-to-contribution ratio.

The graph has a readable text description identifying solid and dashed lines, their shared scale, and the final contribution-plus-interest equation. The long explanation is regular text rather than tiny text inside the SVG. Reflection fields have accessible labels; text, summaries, and controls wrap on phones. The introduction accurately states that results update immediately, and the prompt asks for a prediction or observation in plain language.

Growth descriptions now identify numerical ranges instead of comparing them to investment products or implying expected outcomes. The model states monthly compounding, end-of-month contributions, fixed rates, and excluded costs. The inflation extension uses the exact rate-adjustment formula. These changes clarify the mathematical simulation; they are not personal financial recommendations.

Measured dark-theme contrast failures in Budget, Tips & Discounts, and thirteen finance number/select controls were corrected with explicit text and background colors. The high-contrast inquiry summary was also corrected. Common Cents action names now describe checking an estimate and generating a change-check problem. Numeric entry targets in the changed flows are at least 44 pixels high.

## Coverage of the full tool

| Section | Review and outcome |
|---|---|
| Coins & Bills | Reviewed counting, denomination data, equivalent sets, and responsive entry. Existing coin-set work retained. |
| Making Change | Reworked answer feedback, optional cash construction, count-up guidance, reward ownership, currency changes, and restored state. |
| Tips & Discounts | Added percentage models, exact split reconciliation, explicit support, and correct coupon/percentage equations. |
| Grocery Store | Reviewed existing line-total rounding, checkout stages, cash denominations, and generation boundaries. Browser entry and existing receipt/weight tests passed. |
| Budget | Reviewed allocations and expense flow; corrected income-input contrast. |
| Common Cents | Reviewed denomination-composition and change-check tests; clarified two action labels. |
| Word Problems | Reviewed the entry and existing generated-problem path. Browser checks cover the entry; no live AI generation was exercised. |
| Currency Exchange | Reviewed existing fixed-model and currency-precision checks. Browser entry and existing conversion tests passed. |
| Personal Finance | Reviewed Compound Interest, Retirement, Loans & Debt, Savings Goals, and Finance Quiz. Existing calculation tests retained; form contrast improved. |
| Compound Inquiry | Improved graph explanation, currency consistency, zero/partial-state handling, scenario records, reflection labels, and mathematical wording. |

## Verification and limits

- **99 distinct regression checks passed**, including **50 new checks**. The five-suite final run passed 98 checks; the affected change/percentage suite then passed all 45 checks after the additional coupon-equation regression. Existing engine tests rederive monetary figures and denomination composition independently.
- **69 distinct browser states passed** runtime, automated WCAG A/AA, 320-pixel page reflow, and expanded text-spacing checks. Coverage includes all ten sections, all five finance subviews, changed working states, three themes, zero contributions, and restored underpayment. Three keyboard workflows verify change entry, answer withholding, step navigation, and tray undo.
- Phone screenshots of the change tray/count-up guide and whole-yen split were inspected directly. High-contrast inquiry screenshots were also inspected; this caught stale translated instructions that were corrected and rechecked.
- Source/public byte parity, JavaScript syntax, **70 scoped English keys**, and scoped whitespace checks passed. Initial contrast findings and corrected browser reruns are retained.

Evidence and reproducible scripts are under `scratch/money-deep-2026-09-09/`. The consolidated result is `verification.json`. Browser results combine the initial full pass and targeted rechecks; no failing initial result is discarded. These are local component fixtures using application styles, local React, and simulated host callbacks. They do not establish every generated activity state, full deployed-app integration, live AI behavior, or classroom learning outcomes.

No broad build, staging, commit, push, or deployment was performed. Unrelated workspace changes were preserved.
