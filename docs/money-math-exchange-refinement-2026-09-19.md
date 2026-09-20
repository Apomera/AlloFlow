# Money Math: currency exchange reasoning

Local enhancement completed September 19, 2026.

## Learning and interaction changes

Currency Exchange now supports revision without exposing the answer after a mistake. Blank or invalid answers get precision guidance; other incorrect answers get a directional hint. The learner can reveal the calculation one step at a time or request the complete working. Independent completion earns the existing five XP once per round; using the working marks the round as supported, including when the learner returns to an earlier step or restores saved working.

A responsive three-card conversion path explains the operations: divide by the starting currency's rate to find USD, multiply the unrounded USD amount by the destination rate, then round to the destination currency's precision. The selected rates appear beside the problem; all eight rates remain available in a disclosure. Equivalence and reverse-conversion explanations distinguish a change in currency units from a change in value. The activity keeps its fixed classroom rates, identifies the no-fee model, and makes no claim to supply live quotes or travel recommendations.

Learners can choose the starting and destination currencies and enter their own starting amount. Invalid drafts remain visible and leave the active problem intact. Zero amounts and same-currency comparisons are supported. Applying a conversion or generating the next problem resets working and feedback and focuses the answer field. The random generator samples a distinct currency pair without a retry loop.

Completed answers become read-only while retaining focus. Enter submits an answer except during IME composition. Guide buttons retain focus when an action becomes unavailable, native disclosure markers remain visible, and controls and text wrap on phones. Light, dark, and high-contrast surfaces are explicit.

## Calculation integrity

The model calculates from the source amount and fixed rates rather than trusting a restored answer. Amounts must fit their starting currency's precision. Integer minor units and integer rate ratios preserve exact half-unit boundaries; only the final amount is rounded. For example, converting €0.01 through this model gives ¥2. Rounding the intermediate USD amount to cents first would instead produce ¥1.

The reverse check converts the rounded payable amount back and explains any difference caused by rounding. Whole-yen answers cannot contain fractional yen; other answers cannot contain excess decimal precision that would silently round into a match. Long intermediate decimals are explicitly displayed as approximations, while calculations retain the full ratio. Malformed saved conversions offer recovery. Currency or grade changes clear the old conversion context.

## Verification

- **258 focused tests passed across eight suites**, including **58 new exchange tests**. These cover all 64 currency pairs, exact rounding boundaries, intermediate precision, all eight destination currencies, zero and same-currency cases, reverse rounding, invalid and restored data, input composition, focus, custom problems, support and reward handling, and existing cashier, budget, change, percentage, and inquiry behavior. The initial run had two incorrect test-fixture expectations; both were corrected before the full passing run. The earlier live-interaction test now asserts that wrong answers withhold the solution.
- **36 distinct Chromium states** passed across light, dark, and high-contrast themes. Nine final checks repeated question, complete-working, and custom-entry states after the final text and interaction refinements. All recorded states had no runtime errors or automated WCAG A/AA violations, no horizontal overflow at 320 pixels, and no overflow with increased text spacing. Three final keyboard workflows cover retries, progressive working, supported completion, next-problem reset, custom currency selection, and answer focus after applying a conversion.
- Desktop working, high-contrast phone working, and phone custom-entry/error screenshots were inspected directly. Source/public syntax and byte parity passed. Existing desktop build modules matched the preserved pre-cashier baseline and were safely synchronized; all four Money Math module copies now match. Forty exchange English labels match in the root, public, and existing build registries; the builds also received the 62 labels from the earlier cashier pass.
- Evidence is in `scratch/money-exchange-2026-09-19/`, with the aggregate results in `verification.json`. Browser checks use the real component and application styles with local React and simulated host callbacks. They do not establish deployed-app integration, every possible saved state, or classroom learning outcomes. Other languages retain the existing translation fallback behavior.

The prior cashier enhancement and unrelated workspace changes were preserved. No deployment or installer build was performed. Changes remain local and uncommitted because the shared index contains unrelated staged work; that index was left untouched.
