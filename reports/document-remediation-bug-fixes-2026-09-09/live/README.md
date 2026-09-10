# Live candidate-gate fixes

Policy `20260909-5` closes the four live-gate issue classes in the September 9 bug review:

- Effective native field names participate in the existing source-name preservation check, including native labels, button text/value, image-button alt, and name fallbacks. Equivalent ARIA labeling and consistent label-ID renaming remain allowed.
- Existing accessible descriptions and ordered description/details/error associations retain their resolved text. Consistent ID renaming and supplying a previously missing description remain allowed.
- Superscripts and subscripts inside links retain the link identity and preceding base before descriptive-link normalization removes their DOM nodes. Numeric formatting and inline wrappers remain allowed; descriptive links inside footnotes remain allowed.
- Table headers retain an effective header role and orientation. Invalid fallback role tokens are skipped; the existing constrained first-row scope correction and repair of already-downgraded headers remain allowed.

Added `tests/remediation_gate_regressions.test.js`: 24 rejection cases and 19 valid repair controls. Every case exercises both the strict decision and `aiFixChunked` with mocked transport, including rejection evidence or acceptance evidence.

Validation: **145 distinct tests passed** across five files. The initial [run](vitest.json) passed 117 of 118 tests; its only failure was an added numeric-formatting positive fixture whose adjacent digits crossed a SUP boundary and therefore violated the pre-existing numeric-token policy. The fixture now uses `1000x²` to `1,000x²`. The [final run](vitest-final.json) passed all 70 tests in the new regression file and prior inline-math/option suite. The 75 existing gate/follow-up/semantic cases passed in the first run against the same source bytes.

Verified source SHA-256: `a2c1ea9c7ba90b18ac0546dac54a66ab0e423a1902a375433807ef7363b92abb`.

This local work changes the authoring source and focused tests. Generated shipping bundles and their integration/MCP validation are owned by the parent task. No live model was called and no deployment was made.
