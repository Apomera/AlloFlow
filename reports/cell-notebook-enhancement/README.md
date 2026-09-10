# Cell Simulator: notebook reliability and portability

This pass preserves the concurrent Osmosis Lab and cell study enhancements and extends the existing lab with:

- JSON notebook download/import for resuming the latest eight trials, current controls, prediction, observation, and explanation.
- A readable plain-text evidence report with recorded settings, signed flow index, model limits, and science reference.
- Separate observations captured with each trial; later writing and control edits do not alter that evidence.
- Validated imports that recompute model output from settings rather than trusting supplied result labels. Invalid imports retain the current work.
- Migration of the original i/o/p notebook rows into the corrected model for export, marked as recalculated legacy evidence.
- Defensive rendering of malformed saved notes and trial entries, plus a fix allowing an explanation to be cleared when a legacy hypothesis exists.

The notebook retains the existing eight-trial limit and explicitly prompts users to download before older evidence is displaced. Notebook download is required to preserve this work beyond the current session; this change does not add host persistence.

Source: `stem_lab/stem_tool_cell.js`; mirrored deployment asset: `desktop/web-app/public/stem_lab/stem_tool_cell.js`.

Verification: unit coverage in `tests/cell_osmosis_notebook.test.js`; browser coverage in `tests/e2e/cell-osmosis-notebook.spec.ts` exercises download, invalid import, successful resume, recorded observations, keyboard controls, phone layout, and accessibility. Final run results are recorded below after validation.
Validation before the user redirected this task to Anatomy: all 7 new notebook unit tests passed. The focused rerun passed 19/19 checks, including the earlier failing anatomy context, cell recall, and mirror checks. The initial broader cell run passed 96/100; its four failures passed in the rerun after concurrent fixes and a longer timeout. The notebook browser test is prepared but was not run before the task switch.
