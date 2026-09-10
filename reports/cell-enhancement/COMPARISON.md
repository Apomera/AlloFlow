# Cell comparison enhancement

The Compare route now supports organism search, suggested comparison pairs, safe recovery from invalid saved selections, swapping, and shared/different description filters.

Missing values are identified as incomplete information. Matching compares whitespace-normalized, case-insensitive descriptions; differing descriptions are not presented as proof of mutually exclusive traits.

Claim, evidence, and reasoning drafts are retained by unordered organism pair in the current session. Swapping columns preserves the draft, and returning to another pair restores its writing. Download comparison report exports all seven reference properties and the current explanation regardless of the active display filter.

The anatomy comparison explicitly labels a selected structure as present or absent in each generic cell model, and explains that diagrams are not drawn to the same physical scale.

Validation:
- 34 targeted unit/integration tests passed across comparison, study workflow, interior biology, and library wiring.
- Chromium verified invalid-selection recovery, search with no results, pinned current choices, presets, swapping, separate pair drafts, property filters, full report download, same-organism guidance, and desktop/390px phone layout.
- Phone screenshot visually inspected; no panel overflow.
- JavaScript syntax, scoped diff whitespace, and cell source/deployment mirror parity passed.

Artifacts: comparison-desktop.png and comparison-phone.png in this directory.
