# MCP content coverage and incremental narration — 0.9.0

This is a local development build; it has not been published or attested as a release.

## Changes

- Remediation compares extracted source token occurrences with HTML, including repeated words and numbers. Source and HTML hashes bind the report to the actual files. Missing tokens, unavailable source text, and reported extraction errors or low-confidence pages require review before tagged-PDF delivery or automatic narration. Token ranges locate potential omissions without storing raw passages in the report. Selected-page scope is explicit.
- Narration separately checks eligible HTML text and authored descriptions against planned speech in document order. Missing text and undescribed visuals block synthesis. Inline image descriptions, captions, definitions, disclosure summaries and author verification notes are preserved in both narration styles. Hidden content, controls, decorative images and nonspoken markup are reported exclusions. Math needs an authored spoken description rather than flattening a fraction into ambiguous digits.
- Clip cache keys bind exact speech, language, voice, style and synthesis runtime, independently of document hashes, paths and element IDs. Edits and reordering reuse unchanged clips while rebuilding the complete package in current order. WAV/MP3 hashes and audio format are rechecked before reuse. Final-output reuse retains the existing source/options/runtime/artifact checks.
- Preflight reports cached sections and sections requiring synthesis. Narration reports distinguish reused/generated sections and carry both speech coverage and upstream source coverage when available.
- Existing accessible and natural modes remain. Legacy app string exports retain their prior behavior. Bundled client guidance and privacy documentation explain the new checks and cache scope.

## Verification

- Regression: all 108 distinct tests across 10 suites have passing results. The combined run passed 104/108; four deterministic-adapter/protocol smoke checks failed during slow browser operations (two explicit timeouts and a late valid JSON-RPC response among them). An isolated rerun, including server initialization, passed all five selected checks with unchanged time limits. The machine had about 2 GB of 16 GB RAM free during diagnosis; resource contention is a possible cause, not a proven one.
- Live English Kokoro / Spanish Piper experiment: editing one paragraph reused two sections and synthesized one. Reordering then reused all three sections and synthesized none. Preflight correctly predicted two cached sections and one requiring synthesis. Speech coverage matched throughout; output was 24 kHz mono with 6.210125 seconds of audio. Distinct SHA-256 hashes confirmed that both the edit and the reorder changed the assembled WAV. A completed-package repeat succeeded with browser resolution deliberately disabled.
- EPUBCheck 5.3.0 validated the reordered EPUB against EPUB 3.3 rules: zero fatals, errors, warnings or informational messages. Evidence and output paths are recorded in `scratch/mcp-incremental-live/verification.json`.
- The final local MCPB installer passed extraction and startup verification: v0.9.0, 41 tools, one bundled skill, one prompt, 12 hashed vendor files, 27,443,628 bytes. Capability parity, bundled skill validation, and scoped whitespace checks passed.
- During the earlier live experiment, a transient ENOSPC error interrupted WAV assembly; existing source files and completed clips were preserved. A subsequent run also timed out during synthesis. The successful experiment used a fresh browser state seeded only with the valid clip cache. These interruptions were not treated as successful narration.

## Limits

Source retention is a conservative lexical check: legitimate rewording can require review, and matching words do not prove reading order or semantic equivalence. Checks operate on extracted source evidence and eligible HTML, not direct interpretation of every visual. Blank page candidates may be intentionally blank. Speech coverage does not validate pronunciation or model transcription. Runtime changes can invalidate cached clips; initial synthesis may download public dependencies. Rebuilding an edited package can still require a browser and libraries even when all audio clips are cached.
