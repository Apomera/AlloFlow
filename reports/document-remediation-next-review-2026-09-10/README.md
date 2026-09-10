# Next remediation improvements — September 10, 2026

The next bounded improvement batch should fix three demonstrated preservation gaps and make the existing browser regression suites part of routine CI. This review adds evidence only; application code remains unchanged at policy `20260909-6`.

## Recommended work

1. **[P2] Preserve input length constraints.** A textarea's `maxlength` can change from 200 to 5 and still pass the strict gate and mocked pipeline. Native typing truncates `Blueberries grow well.` to `Blueb`. Compare effective length limits on applicable controls, including the currently omitted `minlength`, and preserve valid equivalent markup. [Form findings](forms/README.md)
2. **[P2] Preserve fieldset/legend context.** A Name field can leave the `Student details` fieldset without changing its text or individual label. The gate accepts it, while Chromium confirms that the textbox loses its named group. Preserve each control's ordered named fieldset ancestry while allowing neutral wrappers and identifier renaming. [Form findings](forms/README.md)
3. **[P2] Preserve meaningful Unicode in accessible names and descriptions.** NFKC normalization treats `m²` and `m2` as equal. Adding a conflicting accessible name, or changing the accessible description's units, passes while Chromium exposes the changed wording. Use NFC for semantic text comparisons and retain canonical accent equivalence. [Unicode findings](unicode/README.md)
4. **Run the existing browser regression coverage in blocking CI.** All 197 Chromium tests from the previous verified batch, across 13 rendered/dependency/export suites, are absent from the checked-in workflow selections. Add a maintained remediation validation command or manifest shared by local validation and CI, with module parity and relevant strict-gate tests. This conclusion comes from static workflow inspection; actual CI history and branch protection were not audited. [Validation inventory and recommendations](validation/README.md)

Items 1–3 should include permanent behavioral regressions for the demonstrated failures and their valid controls. Item 4 should make those fixes and the previously validated browser coverage routine checks rather than relying on a local review run.

## Evidence and limits

Eight new local probes completed: four harmful candidates expose three bug classes, and four valid controls pass. Each harmful candidate was accepted by the actual strict source gate and returned by the actual `aiFixChunked` function with only model transport mocked. Native Chromium verifies the functional or accessibility-tree difference. The prior 197-test total is retained passing evidence, not a new browser-suite run in this review.

- [Form probe data](forms/results.json)
- [Unicode probe data](unicode/results.json)
- [Exact CI inventory](validation/inventory.json)

The source hash for both probe batches is `2a246d27928524c54ee16c8419dfd04904f4a05dfbacd07bd94ffb2825419909`. Both report no source drift; the validation inventory also confirms all seven implementation hashes match the previous fix evidence. No live model, deployment, or human screen-reader testing was performed. These probes establish local acceptance bugs, without claiming that every downstream exporter has the same behavior.

Later validation work remains available: broaden the local strict-gate selector to match the full regression set, verify the independent veraPDF job before promoting it from non-blocking, and complete the currently empty human calibration manifest. Those are separate follow-ups; the four recommendations above are the next batch.
