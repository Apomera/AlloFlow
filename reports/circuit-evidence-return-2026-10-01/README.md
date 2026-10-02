# CircuitTool: reviewing evidence while writing

The explanation-writing heading now includes **Review saved readings** after a valid experiment test. Students can return to the result while drafting, then use the existing **Write explanation** or **Review explanation** action to come back to their response.

The return button sits beside **Expand/Reduce writing space**, with an upward arrow and visible keyboard focus. On phones, the controls wrap into full-width rows. The size control stays first in the heading.

## Behavior

Activating the new button focuses the result heading and scrolls it into view. It uses the existing local result ref and the same explicit focus/scroll pattern as the writing shortcut. Its accessible target is the selected experiment's result heading, including the existing result summary and saved-bench context.

The action preserves the original prediction, explanation, writing size, saved measurements, live circuit, notebook, and history. It is available only for valid tested records. Ordinary rerenders, live edits, and locale changes do not trigger it.

## Scope

Product changes are limited to the existing writing heading and scoped styles in **stem_lab/stem_tool_circuit.js**, with an identical public mirror. The writing field, help, counter, explanation guide, and continuation keep their existing positions. There are no new saved fields, calculations, solver calls, effects, grading, inserted answers, or AI payload changes.

Frozen product SHA-256:

```text
90932f1167d54daf885c256157e4e8a3c647a9cebe62281ccdc0856ec1a3ad63
```

## Verification evidence

All **265 assertions across 15 regression files** passed. The browser audit passed **14 views** across all three lessons, with no reported accessibility violations or material visual issues in the reviewed states.

- [Regression aggregate](regression.json)
- [Regression receipts](regression-receipt.json)
- [Browser results](browser-results.json)
- [Visual review](visual-review.json)
- [Independent validation](validation.json)

The new tests cover valid and unavailable states, legacy records, repeated trips between result and writing, preservation of complete tool data, backward text selection and expanded writing, localization, live edits and probes, replay/Undo, lesson switching, actual JSON import/restore, retry, and separate mounted instances.

Browser checks cover all three lesson writing areas on desktop and phones, actual 200% text on a 320-pixel viewport, forced colors, RTL, keyboard activation, visible focus, control size, local target IDs, and complete writing/evidence round trips.

The saved browser evidence includes 12 native return actions, 42 visible-focus checks, two writing jumps, four lifecycle checks, and 22 measured fonts at exactly twice their original size. Return trips preserve complete tool data, saved readings, the textarea node, text, backward selection, writing size, and internal scroll position. The root reviewer inspected five representative PNGs; the browser reviewer inspected all 14.

Ordinary accessibility scans include contrast. Forced-color scans use the existing documented axe 4.12.1 exception for authored-color reporting, with actual used-color contrast and screenshot inspection recorded separately. The [diagnostic](../circuit-explanation-guide-2026-10-01/forced-colors-diagnostic.json) and its provenance are verified by hash.

From the repository root:

```powershell
node reports/circuit-evidence-return-2026-10-01/run-regression.cjs
node reports/circuit-evidence-return-2026-10-01/browser-check.cjs
node reports/circuit-evidence-return-2026-10-01/validate.cjs
```

Run the browser audit after the isolated regression processes exit. Reports record the original working-file bytes; Git may normalize text line endings. Use a fresh report directory and freeze inputs again if those bytes change.
