# Residual live source-preservation fixes

Implemented review findings 1–3 in `doc_pipeline_source.jsx`, with policy version `20260909-6`.

- Native labels and referenced descriptions now resolve descendant alternatives, including image alt text, descendant ARIA labels, and SVG titles. Native label/control associations stay indexed; consistent identifier renames and equivalent accessible naming remain valid. Hidden native labels keep their browser-provided names, while hidden descendants of visible labels stay excluded. Reference traversal is cycle-bounded.
- Tables now preserve their effective table/grid role using the first recognized concrete ARIA role token. Invalid tokens can fall back to native semantics; existing downgraded tables can still be repaired.
- Existing table and figure captions now retain each superscript/subscript's preceding caption content and script ancestry before caption removal. This detects changing the base or nesting while accepting neutral inline wrappers and canonically equivalent prefixes.

Verification:

- [Focused Vitest evidence](tests-final.json): **240 passed, 0 failed**, across eight suites. This includes **61 new cases** in `tests/remediation_residual_live.test.js` and the existing gate, association, inline-math, option-group, and semantic-fidelity suites.
- [Original review cases replayed](results-final.json): all **six** meet expectations; three harmful candidates are rejected both by the strict gate and by `aiFixChunked`, and three valid controls are accepted. [Replay script](probe-final.cjs) retains the original fixtures and writes only this new evidence directory.
- [Additional native naming observations](native-name-calibration-final.json): 25 local Chromium fixture pairs, covering descendant ARIA/image/SVG names, equivalent naming, ID renames, hidden decorations/references, and missing-name repair. ARIA snapshots do not include descriptions; the units-description case is validated behaviorally by the regression suite, not by these naming snapshots.

Model transport was mocked for repair-path tests. Chromium observations are local synthetic evidence, not human screen-reader or production calibration. No deployment or model service calls were made. Source hashes and the exact policy version used for the six original probes are recorded in `results-final.json`.
