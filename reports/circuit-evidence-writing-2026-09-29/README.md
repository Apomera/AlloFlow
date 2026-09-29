# CircuitTool: write from saved evidence

Students can now bring a selected comparison into their investigation explanation. The action appends measurements after their existing writing and focuses the explanation field. The student still supplies the claim and reasoning.

## Learning flow

- After the first saved observation, a short hint explains how to collect a comparison: change one input or component, keep the other settings and probe positions fixed, then record again.
- The saved comparison includes **Write from evidence**, a question suited to its circuit and probe context, and an expandable preview of the measurements to add.
- **Add readings to explanation** captures both saved points' inputs, meaningful component settings, operating regions, calculated measurements, and probe connections. Changes are explicitly second minus first. Different probe pairs retain their individual signed readings without a probe-voltage delta.
- A repeated action becomes **Review explanation** and moves focus to the existing writing without adding the same paragraph again.
- The evidence paragraph stays with the explanation in investigation JSON and HTML reports. Its circuit descriptions are independent of observation row numbers and the current live circuit.

## Continuity and limits

The action uses current notebook state. Unambiguous note-only changes can retain a captured measurement identity; removed points, imported replacements, and ambiguous older duplicate identities require a fresh selection. Circuit settings, observations, lesson records, and electrical Undo stay intact.

Existing writing is preserved exactly, including whitespace. The total explanation limit remains 4000 characters. An addition that would exceed that limit is refused without truncating writing or measurements. Focus requests are local view state; mounting or loading an investigation does not automatically focus the explanation.

The electrical equations and portable investigation format remain the existing models and `circuit-investigation-v1`. Measurements are formatted with the lab's established rounded display values; component settings retain their normalized numeric values. Notebook writing remains outside the Gemini request.

## Validation

Regression and browser receipts record the source, desktop mirror, tests, and final screenshot hashes. The browser harness renders the local CircuitTool component with React and generated app styles, then checks behavior, export continuity, keyboard focus, touch targets, contrast, phone layouts, enlarged text, and reduced motion.

The regression suite passed **298 tests across 20 files**, including 22 new cases for saved evidence, writing continuity, capacity, stale actions, and focus.

Final browser validation passed **20 accessibility and layout scans**, **26 visible-focus checks**, **8 focus lifecycle checks**, and **three 200% text scenarios**. The 20 screenshots document the run; phone and enlarged-text views also passed a separate visual review. Source and mirror hashes stayed identical; no page errors or visual issues were recorded.

### Preview

- [After the first saved reading](one-reading-next-step-390.png)
- [Preview measurements before writing](readings-preview-390.png)
- [The explanation handoff](appended-explanation-390.png)
- [Circuit context with 200% text](different-circuits-writing-200pct-text-320.png)

### Reproduce

From the repository root:

```powershell
node reports/circuit-evidence-writing-2026-09-29/run-regression.cjs
node reports/circuit-evidence-writing-2026-09-29/browser-check.cjs
node reports/circuit-evidence-writing-2026-09-29/validate.cjs
```

The repository's installed Vitest, Playwright, Chromium, React, and axe-core dependencies are required. Final counts and the screenshot inventory are recorded in `validation.json`, `regression-receipt.json`, and `browser-results.json`.
