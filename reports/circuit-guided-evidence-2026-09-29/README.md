# CircuitTool guided evidence · September 29, 2026

Guided experiments now make the observed change easier to see and revisit. Changes remain uncommitted. No deployment was made.

## Improvements

- Before and after currents use equal-width tracks and one explicitly labeled scale. Zero current has no filled bar; halving and doubling remain proportional.
- Each reading includes the saved circuit settings. A result heading and signed current change summarize what happened.
- The original prediction has its own neutral label after testing. Incorrect predictions remain visible alongside the observed evidence.
- Testing moves keyboard focus to the result once. Typing, loading a saved circuit, and revisiting a lesson keep focus in place.
- Students can load either the experiment baseline or its result without restarting the lesson. Both actions preserve predictions, explanations, evidence, progress, and the separate notebook.
- Circuit loads support Undo. Loading the circuit already on the bench adds no history entry.
- Replay buttons indicate which saved circuit matches the bench. Editing the live circuit leaves the saved readings unchanged and clears that selection.
- Results fit desktop and phone layouts, with visible focus, readable contrast, and controls at least 44px high. Comparison bars introduce no animation.

## Verification

- **162 tests passed in 16 files**, including seven new guided-evidence interaction tests.
- **Four browser workflows passed:** all three experiments plus saved evidence after live-bench edits.
- At **1280px, 390px, and 320px**: 12 axe scans, 12 layout checks, 12 chart-scale checks, and 24 visible button-focus checks passed.
- Four reduced-motion checks passed. The audit reported no page errors or visual issues and saved 12 screenshots.
- Visually reviewed the desktop and phone results, including incorrect predictions and zero current.
- Source and desktop mirror are identical. JavaScript syntax and scoped Git whitespace checks passed.

Browser checks use Chromium, the actual CircuitTool source, React, and the app's cached styles. Other browser engines were not exercised in this pass.

## Screenshots

- [Resistance comparison, desktop](resistance-result-1280.png)
- [Resistance comparison, phone](resistance-result-390.png)
- [Parallel paths with an incorrect prediction, 320px](paths-result-320.png)
- [Closing the loop, desktop](loop-result-1280.png)
- [Saved evidence after a bench edit, phone](changed-bench-390.png)

## Evidence

- [Final validation summary](validation-summary.json)
- [Regression results](regression.json)
- [Browser results](evidence-results.json)
- [Browser audit](evidence-check.cjs)
- [Final validator](validate-final.cjs)

Run `node reports/circuit-guided-evidence-2026-09-29/evidence-check.cjs` to repeat the browser audit. Run `node reports/circuit-guided-evidence-2026-09-29/validate-final.cjs` after the recorded regression suite and browser audit to verify that their evidence matches the current files.

Verified source SHA-256: `3b677c9ee7980cf412d36ee003b6f4860ee0fd405131923d2ac66d85ebe07b23`.
