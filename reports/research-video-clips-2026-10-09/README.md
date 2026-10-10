# Requested YouTube Clips

Implemented locally on 2026-10-09. No live Gemini call, cleanup deletion, staging, commit, push, or deployment.

## Behavior

- Whole-video reading remains the default, including configured research URLs. Ordinary web search and document retrieval are unchanged.
- Source review offers optional Start/End fields for YouTube clips. Seconds, m:ss, and h:mm:ss are accepted; bounds must be nonnegative safe integers with end after start. Timestamped links require explicit opt-in to use their start time.
- Gemini receives a canonical video URL plus validated `videoMetadata` duration offsets only for requested clips. Existing whole-video payloads remain unchanged. Invalid ranges, unavailable providers, managed restrictions, or old loaded modules fail explicitly, without silently reading the whole video.
- Transcription prompts contain the video task and requested bounds, not the private research topic or document context. Cancellation and provider/role checks remain enforced.
- Transcript IDs and the three-entry, memory-only cache distinguish ranges; source identity still groups the same video. Replacing one range's excerpts preserves other ranges and existing exclusions. Limits remain four passages per source, 24 per review, and 1,200 characters per passage.
- Student source details and exports retain validated requested-range metadata and an Open clip start link. AI transcript cautions remain; requested bounds are not verified timestamps for individual quotations. Full transcripts never enter the writer packet or student exports.

## Verification

Receipts are retained in this directory, including intermediate failures rather than replacing them with final successes. Final counts and module hashes are recorded in the completion section below.

- `clip-tests.json`: 234/236 passed initially; the two failures were the new export fixture's CSS URL-attribute selector. The exported link was correct. The fixture now locates the named link and asserts its exact href.
- `ui-tests.json`: 167/168 passed initially; the failing new clip-reload fixture still expected the whole-video button label. Existing review/settings/transcript suites passed.
- `final-clip-ui-tests.json`: 47/47 clip UI checks passed after matching the range-specific reload label.
- `final-projection-regression-tests.json`: 158/158 passed, including the corrected 29-case clip provenance suite and adjacent student/research suites.
- `browser-results.json`: canonical built modules, simulated Gemini HTTP, and desktop/320/390px workflows. No paid provider call is part of this fixture.
- Six module families were rebuilt. Existing generated mirrors were compared before overwrite; the sole source mirror diff was reviewed. `sync.cjs --check` verifies mirrors and loader pins without changing them. Desktop relative loaders are preserved.
- Fifteen English catalog labels were registered with existing fallback behavior.

Initial editing/build/sync attempts encountered intermittent Windows/OneDrive write-open failures. Small retries succeeded after re-reading files. A later UI build hit a system allocation failure; a bounded Node retry completed. No unrelated caches or user files were removed to recover.

## Provider Boundary

The existing generateContent transport uses the documented sibling `fileData` and `videoMetadata` clip shape. The API reference currently marks this metadata interface deprecated; this pass deliberately does not migrate transport APIs. Provider acceptance, actual clip adherence, transcription accuracy, duration, and cost were not evaluated live. A provider failure remains explicit and never triggers a whole-video retry.

- [Official generateContent video clipping guide](https://ai.google.dev/gemini-api/docs/generate-content/video-understanding#customize-video-processing)
- [Official VideoMetadata reference](https://ai.google.dev/api/generate-content#VideoMetadata)

## Reports Cleanup

The requested [read-only cleanup audit](reports-cleanup-audit.md) and [candidate manifest](reports-cleanup-candidates.json) distinguish exact duplicate candidates, larger consolidation opportunities, and protected recovery evidence. No report was deleted. Sizes are logical lengths, not guaranteed physical disk reclamation. The audit documents the OneDrive recall caveat and avoids further broad hashing.

## Completion

Complete locally; ownership released. Taking the latest completed receipt for each test file yields **537 distinct passing tests across 15 suites**, with zero remaining failures. This is an aggregate of the scoped runs above, not a claim that a full application suite ran. `final-ui-polish-tests.json` contains 85 passing checks (49 clip UI and 36 existing transcript UI), including repeated Choose clip focus and a single range introduction.

The final eight canonical browser scenarios passed with no page errors or unexpected external requests. Refreshed 320px, 390px, and 1280px screenshots were inspected. Temporary browser servers were stopped. The existing simulated research preview at http://127.0.0.1:49809/ returned HTTP 200 and reads the updated canonical modules; it is not a live provider evaluation.

All six runtime families, existing mirrors, and named loader pins match `artifacts.json`. Final shortened hashes: ContentEngine `7e035311`, MiscPanels `85efb2f5`, GeminiAPI `704c22ea`, TextPipelineHelpers `118830a0`, ViewSimplified `0af9108e`, DocPipeline `9fbe4362`. Scoped whitespace checks passed; an existing CRLF normalization warning was left untouched. No unrelated work or shared Git index was changed.

The reports audit lists 14 non-final exact duplicate PNG candidates (6,573,387 bytes), plus a larger 359,396,914-byte duplicate-image upper bound requiring owner/reference review. These amounts overlap and must not be added together. No cleanup is authorized or performed by this pass. Recovery archives, final evidence, active work, and differing same-named images remain protected.
