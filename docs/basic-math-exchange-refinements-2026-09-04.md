# Basic math: making exchanges visible

This fifth refinement pass focuses on Base-Ten Blocks and Arithmetic Studio. It connects changing representations to place value and distinguishes exchanges that preserve a quantity from subtraction that reduces it.

## Base-Ten Blocks

- Each trade now shows the actual before and after representations, changed-place markers, expanded expressions, and the equal value of the exchanged pieces. Learners can undo the last trade while retaining their challenge and score. Editing the blocks clears obsolete trade comparisons and answer feedback.
- Trade controls name the quantities directly, such as “10 ones → 1 ten,” and appear in pairs on phones. Add/remove controls have place-specific accessible names; challenge ranges expose their selected state.
- Fixed a quantity-loss bug: ungrouping could produce 29 ones, after which Add previously clamped the count down to 20. Add is now disabled at or above the supported addition limit, with an explanation to trade or remove blocks first. Ungrouping still preserves every block. Repeated activation before a render cannot execute the same exchange twice.
- The fourteen-ones starter clears lingering addition state. It remains available only for an empty workspace without an active challenge. Expanded-form and number-word text is darker for readability.

## Arithmetic Studio

- Each addition or subtraction model step highlights changed places with a dashed outline and an explicit disk-count change.
- Before/after expressions make conservation visible during carrying and borrowing, including borrowing across zero. For 102 − 38, the exchange steps retain value 102; the final removal explicitly shows 102 − 38 = 64.
- Short prompts invite learners to predict the next step and explain the final disks. Previous-step navigation retains the matching comparison.

## Verification and scope

The final five-suite regression run covered 80 tests: 79 passed and one starter fixture incorrectly assumed the activity was visible during an active challenge. After correcting that fixture, all 14 dedicated interaction tests passed. The two large locale checks initially exceeded the short test deadline; both passed when rerun with a 60-second deadline, and both passed in the final broader run.

All 18 final activity/theme cases passed Chromium runtime, automated WCAG A/AA, and 320-pixel reflow checks. Cases cover grouping, ungrouping beyond the Add limit, hundreds-to-thousands exchange, carrying, borrowing across zero, and final removal in default, dark, and high-contrast themes. Desktop and phone screenshots were captured; the phone exchange and subtraction layouts were inspected directly. These are component fixtures using the actual application stylesheet, React, tool modules, and English strings.

Syntax, root/public byte equality, and scoped whitespace checks passed. New English text is registered and the public copies are synchronized. Evidence and reproducible scripts are in `scratch/basic-math-pass5/`; key results are `final-tests.json`, `final-focused-tests.json`, and `final-browser-results.json`. Dedicated behavior tests are in `tests/basic_math_exchange_comparisons.test.js`.

This pass does not establish measured learner outcomes or complete end-to-end application coverage. No broad build, staging, commit, or deployment was performed. Unrelated concurrent work was preserved.
