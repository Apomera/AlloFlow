# Basic math UI and UX review

Reviewed and improved all ten tools in **Math Fundamentals**. Every existing activity, calculation, challenge, model, and export remains available. Changes are in the workspace and its desktop runtime mirrors; no deployment was performed.

## Changes

| Tool | Improvements |
| --- | --- |
| Number Line | Persistent labels for marker value, optional label, and color; concise instructions for each mode; a visible phone scrolling hint; expandable background explanations. |
| Area Model | “Swap rows and columns” replaces the unexplained “Commutative” control; the toggle announces its state; mode-specific instructions; wrapping actions; expandable teaching notes. |
| Arithmetic Strategy Studio | Activity navigation comes before operation and practice-level settings, so the settings follow the activity they affect. |
| Fraction Lab | Clear instructions for pointer and keyboard selection; more readable help and controls; all ten activities remain reachable. |
| Math Manipulatives | All 26 tools remain in the grouped selector. Duplicate related-tool shortcuts and teaching notes are expandable. Abacus beads have unique names and pressed states. Place-value disk controls name the place they change. Disk columns reflow on phones; hundreds-chart actions wrap; fraction bars retain equal lengths inside a named scrolling region. Secondary activity text and rod/disk labels have stronger contrast. |
| Multiplication Table | “Table answers visible/hidden” and “AI Tutor” replace vague labels. Hiding answers uses toggle semantics. All three activities, timed practice, hidden answers, and the full table remain available. |
| Ratios, Rates & Proportions | The challenge answer has a persistent visible label; all five modes, free exploration, hints, and practice remain available. |
| Money Math | Explicit keyboard instructions for adding money; more readable ordinary controls; all ten activities remain available. |
| Unit Converter | Visible labels distinguish input value, source unit, converted result, and destination unit. Fields stack on phones. “Change measurement” clarifies the category selector, and the tutor close button has the correct accessible name. Teaching explanations remain expandable. |
| Time & Schedule Lab | Instructions identify the exact time field, adjustment buttons, and minute slider; larger ordinary controls support all four activities. |

The shared sizing rules apply only to these basic math tools. Ordinary buttons and form controls receive larger targets, and small control text is increased. Mathematical table cells, fraction segments, and explicitly sized geometric pieces retain their proportions. Native expanders preserve keyboard access and keep longer explanations available without putting them ahead of the task.

## Verification

- **202 passing regression tests across 21 files.** Coverage includes calculations, grading, mode navigation, retained state, accessible form controls, all Money Math activities, named abacus interactions, and opening help without changing an entered conversion.
- **192 browser state/viewport checks:** all 76 primary activities at desktop and phone widths, plus opening screens in light, dark, and high-contrast themes. No automated WCAG A/AA violations, horizontal page overflow, or runtime errors in the final results.
- **40 additional opening-screen checks**, including 320-pixel width and increased line, word, letter, and paragraph spacing. No page overflow or automated accessibility violations.
- The phone screenshots for all ten tools were visually inspected. Files parse successfully, and the edited runtime files match their desktop copies.
- An existing number-line test fixture was missing its translation callback; the fixture now supplies it so the grading regression executes normally.

The browser harness mounts the real tools with the shared tool wrapper, local React, application colors, and English strings. AI services, speech services, and surrounding app callbacks are stubbed. These checks cover primary activities and selected interactions; they do not certify every nested activity, saved state, language, browser, or assistive technology. Manual screen-reader and physical touchscreen testing remains useful.

## Evidence

- [Verification summary](../reports/basic-math-ux-2026-09-12/verification-summary.json)
- [Primary browser results](../reports/basic-math-ux-2026-09-12/after/review.json)
- [Compact and text-spacing results](../reports/basic-math-ux-2026-09-12/compact/review.json)
- [Initial regression run](../reports/basic-math-ux-2026-09-12/regressions.json) and [final focused run](../reports/basic-math-ux-2026-09-12/final-regressions.json)
- Phone examples: [Number Line](../reports/basic-math-ux-2026-09-12/after/numberline-375.png), [Fraction Lab](../reports/basic-math-ux-2026-09-12/after/fractions-375.png), [Manipulatives](../reports/basic-math-ux-2026-09-12/after/manipulatives-375.png), [Unit Converter](../reports/basic-math-ux-2026-09-12/after/unitconvert-375.png).

Reproduce the browser review with `node dev-tools/review_basic_math_ux.cjs --deep`; use `--compact` for the additional small-screen and text-spacing checks. The `before` folder records the initial, narrower review. Screenshots ending in `-finding.png` are investigation evidence from intermediate runs; the final JSON results and default screenshots are the current verification artifacts.
