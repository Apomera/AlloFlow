# CircuitTool: see the next learning step

The Active guided experiments now show a student's current step and the saved work behind it. An explicit explanation shortcut brings the writing field into view after a test.

## Learning journey

The three-step **Predict → Test → Explain** guide follows the selected experiment's normalized saved record:

| Saved work | Current step | Next-action cue |
| --- | --- | --- |
| No experiment started | Predict | Read the plan and start the experiment. |
| Started, no prediction selected | Predict | Choose a prediction before testing. |
| Prediction selected | Test | Run the planned change and compare the readings. |
| Tested, explanation empty | Explain | Use the saved readings to explain what happened. |
| Tested, explanation entered | Explain | Review or revise the saved explanation. |

Prediction and test steps show when their records are saved. Explain stays current while the student writes or revises; entering text records an explanation without grading its quality. Whitespace-only text and notes entered before testing do not count as a saved tested explanation.

The guide uses saved lesson records independently of the live circuit. Incorrect predictions, electrical Undo, replay, imported records, and live settings retain the same learning stage. The helper performs no solver calculations or state writes.

After testing, **Write explanation** or **Review explanation** focuses the existing writing field and scrolls it into view. This explicit navigation preserves the circuit, prediction, notes, Undo, Redo, and notebook. Mounting the guide, editing notes, switching locale, and rerendering do not trigger that shortcut automatically.

The step guide uses text and shape along with color. Its scoped styles adapt to narrow screens and enlarged text, retain page direction, and use system colors in forced-colors mode.

## Validation

**389 tests passed across 24 files**, including 27 cases for saved-record stages, explanation status, and focus continuity. Source and desktop mirror remained identical and unchanged: `14cf70052ba746a72fa6cbba8d390b077111e63e590920a0d5429164808f260f`.

Receipts record the exact source, desktop mirror, tested files, browser audit script, actions, accessibility scans, focus, layout, and screenshot hashes. The final browser run kept its source and audit script unchanged and passed:

- **19 accessibility and layout scans**, with 20 reviewed captures across all five saved-work phases at desktop and phone widths.
- **19 visible-focus checks**, six focus transitions, and three keyboard explanation jumps. A real backward text selection retained its positions and direction; collapsed selections retained their caret positions while Chromium normalized the direction flag.
- Two cases doubled the guide's actual text sizes at 320 px. Four checks preserved the intended step order and current-step marker under right-to-left direction.
- Reduced-motion, control-size, numeric step-label integrity, and CSS isolation checks passed, with no runtime or material visual issues.

The 17 ordinary accessibility scans include the full contrast rule. The two forced-colors scans exclude only axe's `color-contrast` rule because axe 4.12.1 reports authored colors in this mode despite Chromium rendering system colors. [The earlier reproduction](forced-colors-diagnostic.json) is copied with its original path and hash; it was not rerun for this update. Separate computed-color checks cover 14 rendered guide text nodes, all at 21:1 contrast, and both forced-colors views were reviewed. These checks describe the reviewed views rather than certify the entire application.

### Visual review

- [Desktop starting step](journey-start-1280.png)
- [Phone explanation step](journey-explain-320.png)
- [Saved explanation at 200% text](journey-review-200pct-text-320.png)
- [Saved explanation in forced colors](forced-colors-journey-review-320.png)
- [Explanation shortcut and writing context](review-explanation-action-320.png)

### Reproduce

From the repository root:

```powershell
node reports/circuit-lesson-journey-2026-09-30/run-regression.cjs
node reports/circuit-lesson-journey-2026-09-30/browser-check.cjs
node reports/circuit-lesson-journey-2026-09-30/validate.cjs
```

The installed Vitest, Playwright, Chromium, React, Tailwind cache, and axe-core dependencies are required.
