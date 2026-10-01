# Scale Explorer: connected investigations

The learning workspace now connects a question, prediction, measured comparison,
scale drawing and explanation in one saved investigation.

- Explore, Investigate, Compare, Model, Draw and Notebook tabs replace the long
  default stack of panels. Arrow keys, Home and End navigate the tabs. The chosen
  workspace survives reopening, and **Show all tools** keeps the original layout available.
- Learners can use the suggested investigation question or write their own. A
  persistent investigation card shows the available steps and distinguishes its
  draft from the last saved notebook record.
- Comparisons and drawings use the investigation's captured dimensions, including
  personal heights. A drawing collection may be refitted around a larger reference
  while preserving the original investigation measurements.
- Saving a drawing adds evidence to the investigation draft. **Save linked
  investigation** saves the question, prediction, explored comparison, drawing and
  explanation together. Later drafts and unrelated drawings do not mutate saved
  investigation evidence.
- Each saved investigation can download its own calibrated drawing SVG. Notebook
  text exports include the question, captured dimensions, comparison evidence,
  drawing scale and notes, and explanation. Unsaved edits stay out of exports.
- Legacy investigations remain usable. Unknown specimens, mismatched heights,
  invalid drawings and unsupported workspace names are normalized safely. The
  existing twelve-investigation limit still permits updates and removal.

## Verification

The numerical and compatibility run covers 146 checks across eleven suites. The
exhaustive comparison check was rerun with a larger timeout; its assertions were
unchanged.

Four new browser scenarios verify the entire linked workflow, an exact 3D ratio,
collection fitting, independent saved and draft evidence, keyboard navigation on
a 320 px phone, reopening, legacy records, capacity controls and failed downloads.
The tests also verify that WebGL contexts are released on unmount. Together with
the existing feature regressions, 82 browser scenarios were verified across the
main run and targeted reruns.

Existing feature regressions explicitly select **Show all tools**. The descent
test waits for the application's reduced-motion control before proceeding after
a media change, so its frozen animation clock does not race that transition.

Initial validation used an isolated source candidate to keep concurrent
terrain-flight work separate. The final seven investigation and workspace cases
passed against the exact commit candidate merged with the newly committed flight
enhancement. A browser page-startup failure was rerun without changing assertions.
The source, desktop mirror and English catalog
changes are prepared against the latest committed tree; unrelated working changes
and staged files are preserved.

## Examples

- [Desktop notebook](desktop-notebook.png)
- [Desktop drawing](desktop-drawing.png)
- [Phone workspace](phone-workspace.png)
- [Saved investigation drawing](investigation-drawing.svg)
- [Saved investigation notebook](investigation-notebook.txt)

## Reproduce

```powershell
npx vitest run tests/scale_explorer_workspace.test.js --maxWorkers=1
npx playwright test -c reports/scale-explorer-workspace/playwright.config.cjs scale-explorer-workspace.spec.ts
```
