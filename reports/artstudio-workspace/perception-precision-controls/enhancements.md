# Perception Lab: precise experiment controls

Application status: applied to the project and desktop copy. No commit was created. See [application.json](application.json).

All eleven adjustable settings across the six experiments now have an exact-value field and an individual **Reset** control beside their sliders. Each field displays its range, units, and step size; the moiré crossing angle supports 0.1° increments. These additions make it easier to reproduce a drawing or change one variable while retaining notes, predictions, pinned comparisons, and saved observations.

Typed values remain local drafts until Enter or leaving the field. Escape cancels a draft before the focused workspace handles Escape. Empty, non-finite, out-of-range, and off-step values show an accessible error and leave the actual drawing unchanged. Slider changes supersede numeric drafts; external value changes and learner/experiment changes discard stale drafts. Reset discards the draft, restores only that setting's default, announces the result, and returns focus to its exact-value field.

The precision controls use the existing experiment limits and normalization. They remain disabled for the entire repeated study, including the revealed-results stage, until the study ends. They do not add an exact comparison-target field, and the brightness reference field remains hidden in matching mode. A committed drawing edit returns a switched comparison to Current. Focusing an exact-value field pauses moiré at the visible frame; resetting a rotating angle restores its default without replaying the old frame.

## Verification

- **187 targeted tests pass across seven suites**, including 40 new precision-control cases plus experiment, matching, repeated-study, focused-workspace, live-comparison, and PNG-export regression suites. Combined runs returned incomplete results, so missing suites were run individually. The final aggregation includes all seven passing suites on the same source hash, with raw results and execution records retained.
- **33 Chromium check groups pass**: all eleven settings and resets; invalid entry and correction; Escape handling; native decimal stepping; blur behavior; stale drafts; live comparison selection; moiré motion; all three matching-study modes; five viewport widths; 200% text in portrait and short landscape viewports; and dark, contrast, and forced-color themes.
- Browser checks include native number inputs and keyboard events, no horizontal overflow or clipped control rows, controls at least 44 px, no targeted WCAG A/AA axe violations, and no browser runtime errors.
- Source and desktop mirror are identical. Experiment definitions, drawing geometry, normalization, measurement calculations, and study helpers before the stylesheet are byte-for-byte unchanged. Seven English interface strings are added.
- Screenshots are reviewed for desktop, phone, enlarged text, dark, and high-contrast layouts. The broader historical suite was not rerun; this report covers the selected seven suites and Chromium checks.

The browser checks exposed two issues during development: Tab into Reset initially skipped applying a value, and a number/unit row clipped at 200% text. The final implementation handles keyboard blur separately from pointer reset and wraps rows using a text-relative width. Both cases are covered by the passing browser checks.

## Evidence

- [Validation](validation.json)
- [Selected tests](selected-test-results.json)
- [Browser checks](precision-browser-results.json)
- [Desktop controls](controls-1600.png)
- [Phone controls](controls-390.png)
- [200% text](text-200-390.png)
- [Dark theme](dark.png)
- [High contrast](contrast.png)

Final source SHA-256: `5e87e036527367946e53fff6cd6a373a2564b0b82833e7c88760887e8e7770e5`.

No commit was created.
