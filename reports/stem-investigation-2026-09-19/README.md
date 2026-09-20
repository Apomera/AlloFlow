# STEM investigation enhancements — 19 September 2026

This pass extends OpenBIM and Taxonomy Explorer. The sim, circuit, and molecule shelves remain outside this work.

## OpenBIM design trial notebook

- Save up to 20 named dimension studies with reasoning and a date.
- Compare the current design against a saved trial using computed floor area, work area, and rectangle fit.
- Rotate the work rectangle to explore how equal area can produce a different fit.
- Restore a trial, remove it with undo, and export the notebook as Markdown.
- Preserve trials in the portable AlloFlow recipe. Imported results are recomputed from validated dimensions, and duplicate trial IDs are normalized so each trial remains selectable.
- Require edited dimensions to be applied before saving or rotating. Changing a proposal clears its previous export approval.

The studies use classroom targets: work area at least 24 m², floor area at most 60 m², and a work rectangle that fits. They do not generate IFC geometry or measure accessibility clearance.

## Taxonomy evidence coaching

- Request feedback on a teaching example's key decisions.
- Return to the first conflicting or uncertain decision without being given the final group.
- Clear previous feedback when revising the decision path.
- Record observation context and the next evidence to seek, and retain both through revisions and Markdown export.
- Keep a stable example identity so a field note with the same title as a lesson card stays a field note.

Feedback checks the teaching card's written evidence and does not establish species identity. Photo identification remains gated.

## Validation artifacts

Final result: **51 tests passed**, plus **6 browser workflows**. The checked panels had no automated accessibility violations or horizontal overflow at the tested phone widths. The existing OpenBIM export suite passed all 8 tests in isolation with a 60-second test allowance for local Python startup. JavaScript syntax, scoped diff checks, and source/mirror parity passed. See `validation-summary.json`.

- `refinement-results.json`: tests for comparisons, trial persistence and import normalization, evidence feedback, revisions, and field-note identity.
- `unit-results.json`: existing taxonomy coverage and investigation checks.
- `browser-results.json`: six browser workflows, covering both tools in light, dark, and high-contrast themes; automated accessibility checks and horizontal overflow measurements at 375 and 320 pixels.
- `browser-qa.cjs`: browser runner, with exported Markdown notebooks and desktop/mobile screenshots alongside it.

Both edited source modules are mirrored into `desktop/web-app/public/stem_lab/`. No deployment was performed.
