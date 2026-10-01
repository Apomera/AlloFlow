# Dissection Lab: clearer learning checkpoints

September 30, 2026

## What changed

The Predict, Perform, and Explain checkpoint now shows readable **Current**, **Done**, and **Upcoming** labels. Answer cards have numbered markers, lighter text, and more space between choices. Supporting text is at least 14px, answers use 15.2px, and the large text setting uses 16px. The layout follows the lab's available width, including a 320px lab inside a wide window.

Arrow keys browse the choices; Home and End move to the first and last choice. Enter or Space checks the focused answer. Browsing leaves the learner's saved answers, evidence, and specimen progress untouched. Modified keys and input composition keep their normal behavior.

A correct explanation moves focus to the next checkpoint heading, with the Next card as a fallback after the protocol is complete. A correct guided observation returns focus to the specimen. This keeps the keyboard path connected when the answered choice buttons disappear.

A wrong answer shows **Review choice** and readable coaching. The selected button is associated with that feedback for screen readers. Guided observation checks share the numbered cards and keyboard support. The choices retain their original accessible names.

Once a plan is confirmed, **Prepare {tool}** opens Technique controls and focuses the required instrument. **Go to specimen** focuses the canvas. The learner chooses the instrument and performs the action. A shorter note explains the motor-neutral action available after readiness checks pass. Planning checkpoints stay hidden during quizzes and timed practicals.

## Visual review

| Layout | Before | After |
| --- | --- | --- |
| Phone, 320px | [Before](before-phone.png) | [After](after-phone.png) |
| Tablet, 768px | [Before](before-tablet.png) | [After](after-tablet.png) |
| Embedded, 320px with large text and high contrast | [Before](before-embedded-large.png) | [After](after-embedded-large.png) |
| Desktop, 1180px lab | [Before](before-desktop.png) | [After](after-desktop.png) |
| Forced colors, 390px | [Before](before-forced-colors.png) | [After](after-forced-colors.png) |
| Reflection | [Before](before-reflection.png) | [After](after-reflection.png) |

Additional states: [wrong-answer coaching](after-coaching.png), [confirmed plan and shortcuts](after-perform.png), and [guided observation](after-guided.png). Five focus captures and layout measurements are saved beside this report.

Screenshots put the floating next-action card into document flow for component capture. This capture style is limited to the tests.

## Verification

**11 browser scenarios verified**, **258 regression checks passed**, and **9 scoped accessibility audits without violations**. Both renderer copies are byte-identical, JavaScript syntax is valid, and scoped whitespace checks pass. See [verification.json](verification.json).

- Five layouts: original answer names, readable text, wrapping, visible focus, retained evidence, and axe audits for WCAG A and AA rules.
- Prediction: focus navigation records no answer; explicit activation records one attempt, shows coaching, and confirms the plan after a correct choice.
- Reflection: explicit explanation verifies that checkpoint, preserves tissue state and physical progress, and focuses the next checkpoint heading.
- Preparation shortcuts: focus the required tool and canvas while preserving tool selection, evidence, and procedure progress.
- Guided observation: browsing and incorrect choices preserve the current step; an explicit correct observation verifies the identification and focuses the specimen.
- Quiz and active timed practical: planning checkpoints remain absent.
- Existing renderer, workspace, and reference workbench regressions.

### Execution notes

The first interaction fixtures omitted saved tissue data. The existing answer handler initializes that data when saving a response, so equality checks failed. The fixtures now contain complete tissue data and verify that answering preserves it. The initial diagnostics are retained in `browser-results.json`.

The main run passed nine scenarios. Two layout cases completed their assertions but timed out while closing the browser. The suite now disables video recording, and the rechecks allow 240 seconds per test. Forced colors passed in `browser-recheck-results.json`; the embedded layout passed in `browser-embedded-results.json`. The confirmed-plan note was shortened after visual review, and its layout and shortcut behavior passed again in the recheck. These results verify all eleven distinct scenarios.

The final focus handoffs passed both scenarios in `browser-focus-fixed-results.json`. The first quoted focus filter matched no tests; the final run passed its arguments directly to Playwright. All 258 regressions passed again after the focus fix; that final run is saved in `unit-focus-results.json`.

The main report remains in `browser-final-results.json`. Accessibility audits, measurements, screenshots, regression results, and final source verification are saved in this folder.

Changes remain uncommitted.
