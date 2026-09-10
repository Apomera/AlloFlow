# Rendered occurrence preservation fix

Residual finding 6 is fixed by anchoring visible and accessible text to canonical character ranges in the complete checkpoint text. A newly revealed duplicate cannot supply a missing original negation. Native AX StaticText backend IDs associate exposure with the corresponding DOM text node; a failed association yields unavailable coverage. Grapheme-based NFC normalization allows equivalent accents across markup boundaries without compatibility folding.

The new occurrence spec covers duplicate restoration before and after the original, inline duplicates, ARIA-only loss, Chinese instructions, harmless rewrapping, full and partial hidden-content restoration, combining accents, whitespace, emoji, and the explicitly narrower text-only contract.

Focused validation passed **61 tests in 46.8 seconds**: 11 new occurrence cases and 50 existing rendered corpus/content cases. [Initial machine-readable report](initial-results.json) and [individual artifacts](initial-artifacts/) retain the observations. Checker SHA-256 for this run: `227db95eb409c78bc7501e0f5588c28734b9876b730ea2e31ae9c6ca1eab0895`. This precedes the root agent's shared dependency integration; its final combined validation supersedes this implementation hash.

Accessible alternatives without DOM text retain a supplementary ordered-text comparison; explicit `name` checkpoints remain necessary when their source occurrence identity must be preserved. This work changes the optional Chromium comparison, not live candidate acceptance or human screen-reader validation. No live model calls or deployments were made.
