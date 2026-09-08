# School store UI and functionality review — September 8, 2026

The store now uses the full browsing area for students, with colorful reward cards, a clear available balance, saving-goal progress, and search and filters. The cashier view keeps live balances, stock, and checkout confirmation together. The local demonstration includes six fictional rewards to show affordable, aspirational, unlimited, and sold-out states.

## Improvements delivered

- Reward cards have a consistent image area with decorative gift artwork when no product photo exists, clear prices and stock labels, and a distinct selected saving goal.
- Search by name or description; sort by points or name; filter within the student's available balance or to in-stock rewards. Clearing filters restores keyboard focus to search. Filtering preserves the cashier cart.
- The wallet separates available points from points reserved for Print Lab. Saving a goal does not spend points or reserve inventory. Sold-out goals explain that they can be kept or changed.
- Larger touch targets, visible keyboard focus, readable empty states, and mobile spacing. Focus stays above the bottom navigation; navigation returns to normal document flow on short screens.
- Goal changes and cart quantity changes preserve keyboard focus. Removing the last item returns focus to its catalog action, with a budget-summary fallback when the item is filtered out. Search does not repeatedly announce an unchanged wallet balance.
- English and Spanish control text, dynamic result counts, shopping-window labels, and accessible goal progress. Staff browsing does not show cashier-only instructions.
- Light, dark, high-contrast, and forced-color styles; decorative graphics remain hidden from assistive technology. Quantity is announced using real screen-reader text instead of an unsupported ARIA label.

## Print Lab timing bug fixed

A slow refresh after asset verification could leave the quote form editable, then replace an entered quote with the default when the refreshed data arrived. The quote fields now stay disabled throughout asset review, and the saved-state notice remains busy until current details finish loading. A browser regression deliberately holds the refresh response and verifies both the disabled inputs and the eventual 15-point quote.

## Verification

- **483 tests passed across 16 files**, covering repository rules, security cases, portal behavior, language packs, practice mirrors, store refinements, and Print Lab/Sculpt integration.
- **11 browser views passed with zero axe WCAG-tagged violations**: student desktop, mobile, narrow, short viewport, dark, high contrast, forced colors and overview; cashier desktop/mobile; staff store. Spanish switching and keyboard actions were checked separately.
- Gradient backgrounds require additional contrast review. Calculations using the actual CSS colors and 101 gradient samples per text element produced a minimum **5.96:1** ratio. Desktop, mobile, dark, and cashier screenshots were visually inspected. Forced-color controls use system colors.
- The complete fictional workflow passed: award to 80 points → reserve 15 for printing → buy a 10-point notebook → fulfill the print → refund the print. Exact private asset download, rejected cross-origin requests, inventory, and ledger integrity also passed.
- Source/public portal, language, and practice mirrors match. Spanish coverage is **970/970 catalog entries**. No dependencies or external services were added.

The accessibility checks use the [WCAG 2.2 requirements](https://www.w3.org/TR/WCAG22/) and its [focus-not-obscured guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum). Automated scans and scripted keyboard checks are useful evidence; they are not a formal accessibility certification or a substitute for testing with the school's actual assistive technology.

## Administrator walkthrough

Open **http://127.0.0.1:8767/?role=student**, select **Store**, and try search, the balance filter, a saving goal, and the sold-out reward. Change the demo role to **Cashier**, choose Avery, add a notebook, and review the balance and confirmation. The toolbar's **Store + Print Lab walkthrough** gives the complete sequence; **Try design and material planning** opens the design tools.

The demonstration uses fictional records and in-memory substitutes for Google services, email, and printing. The production Apps Script deployment was not published or changed by this review. Structural strength and material planning remain advisory; a real slicer review and physical checks are still needed for printed pieces.

## Evidence and reproduction

- `reports/school-store-ui-review-2026-09-07/validation-summary.json`
- `reports/school-store-ui-review-2026-09-07/browser-results.json` and accompanying screenshots
- `reports/school-store-ui-review-2026-09-07/regression.json`
- `reports/school-store-ui-review-2026-09-07/store-flow/full-demo-results.json`
- `node dev-tools/school_store_ui_check.mjs`
- `node dev-tools/school_rewards_full_demo_check.mjs`
- `npx vitest run tests/school_rewards tests/school_store_design_refinements.test.js tests/print_lab_tool.test.js tests/sculpt_description_recovery.test.js --maxWorkers=1 --pool=forks --testTimeout=60000`
