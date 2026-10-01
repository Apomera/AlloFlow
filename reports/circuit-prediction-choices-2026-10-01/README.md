# CircuitTool: clearer prediction choices

Students can now choose a prediction using three balanced cards. An upward, level, or downward arrow reinforces the existing **Increases**, **Stays the same**, and **Decreases** labels. A check marks the selected card. Every choice uses the same selected appearance, so the display does not reveal the experiment's answer.

The shared cue makes the comparison explicit: **Compared with the starting circuit.** Before a prediction is chosen, the Test button's visible description says **Choose a prediction to enable Test.** After a choice, it explains that Test runs the planned change from the baseline. Each choice and the Test button are associated with their respective descriptions for assistive technology. The diagrams and check marks are decorative.

Fresh **Start transistor prediction** now has the same emphasis as the enabled Test action. The cards sit side by side on desktop and stack as compact rows on phones.

The existing button names, order, pressed state, prediction callbacks, and Test prerequisite remain intact. A prediction continues to save without loading a circuit or running the test. Saved results, writing, notebook, history, imports, and AI context keep their existing behavior.

This pass also includes the earlier writing-space, saved-stage entry, and experiment navigation improvements. Their archived reports describe the work at the time those rounds completed.

## Verification

**219 tests passed across 12 files**, including 16 new cases for prediction choices. Each file ran in a fresh process with one worker and the existing time limits. The earlier entry, map, continuation, writing, journey, experiment-plan, record, navigation, localization, and form-label checks passed on the final source.

The browser audit passed 12 views at desktop and phone widths, including 320px with 200% text and forced colors. All 12 screenshots were inspected.

- Seven native keyboard actions covered Start and all three choices through Test. Predictions and existing writing remained saved, including predictions that differed from the result.
- All 37 focus checks passed. Selecting a choice kept keyboard focus, updated one pressed state and check mark, and enabled Test without loading a circuit.
- Two actual JSON import/restore and locale/live-edit workflows preserved saved progress and the 12-row writing preference.
- Both enlarged-text cases doubled all 19 measured HTML font sizes, including the cards, Test button, and help.
- Ten ordinary axe scans passed with contrast checks enabled. Two forced-color scans excluded only the documented axe 4.12.1 contrast issue; all 13 visible text nodes in those views passed checks of their actual colors at 21:1.
- The 30 captured card labels inherited the button's color and font size with zero margins. All three choices shared the same selected appearance.
- Scoped-style, control-size, overflow, duplicate-ID, reduced-motion, source syntax, and whitespace checks passed.

These checks cover the changed controls and related lesson behavior.

### Initial finding and correction

The first browser run found selected text at 1.07:1 contrast because the new label reused a Simple-workbench class. The new Active label now has its own class and inherits its button's color. The complete regression and browser audit were rerun on the corrected source. The first run's reports, six captures, compressed source snapshot, and scripts remain in **initial-attempt** as separate evidence; those captures are excluded from the final 12-view count. The compressed snapshot restores the exact original source bytes; its hash is checked by the validator.

## Previews

### Desktop

![Prediction choices and disabled-Test guidance](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-prediction-choices-2026-10-01/prediction-empty-1280.png)

### Phone

![A saved prediction and enabled Test action](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-prediction-choices-2026-10-01/prediction-less-390.png)

### Enlarged text

![Prediction controls at 200% text size](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-prediction-choices-2026-10-01/prediction-less-200pct-text-320.png)

Source and desktop mirror: `fff052d145b7e16ea99b424c6d81ccdc4049b6dcf0da85258d970d75a9aef8cf`.

## Reproduce

From the repository root:

```powershell
node reports/circuit-prediction-choices-2026-10-01/run-regression.cjs
node reports/circuit-prediction-choices-2026-10-01/browser-check.cjs
node reports/circuit-prediction-choices-2026-10-01/validate.cjs
```

The regression runner retains raw per-file results, exact assertions, commands, and file hashes. Raw hashes include the original Windows line endings. Use a fresh report destination if source bytes or line endings change. The installed Vitest, Playwright, Chromium, React, Tailwind cache, and axe-core dependencies are required.