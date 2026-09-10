# Measurement interior and dock review

The expanded measurement inspector now matches the pine and ivory workspace. Layer controls and equivalent-volume teaching panels use quieter surfaces, readable 11–12px text, sage progress, full-width native view selection, and 44px controls. The physical **Build This!** card action uses a restrained outlined button. Save connection still distinguishes draft, ready and saved states.

Correctness cues remain separate: incomplete results stay red, estimate and recommendation panels stay amber, and revised-answer success/failure colors remain intact. High-contrast overrides cover the new surfaces, controls, text and progress. No blanket recoloring was applied to measurement feedback.

The edit changes scoped classes, presentation attributes and CSS only. It preserves equations, labels, actions, native disclosure behavior, the compact dimensions/volume summary, sticky Close header and selected-build/Print Lab semantics. Canonical source and the desktop mirror parse and match byte for byte. Existing mobile-inspector and keyboard-access tests are recorded in `measurement-interior-tests.json`.

Review evidence used the prior actual screenshots `after-focus-1440x900.png` and `after-measure-expanded-320x700.png` in the mobile-refinement report, plus `workspace-pass-320x700-expanded.png` in the graphics report. Browser QA for this pass is coordinated separately; this task launched no browser.

The bounded dock review also identified these concrete follow-ups, owned by root:

- Label the physical print envelope Width, Depth and Height in millimetres; emphasize only axes that exceed the printer bed and retain the accessible aggregate dimensions.
- Include open surfaces and preparation errors in readiness. Existing polling records `openEdges`, but the prior positive status/outline ignored it.
- Increase the dock’s Clear selection target from its explicit 36px override to 44px.

No changes to STL content, handoff scale, printer profile ownership or round-trip workspace behavior were needed for this visual pass.
