# Source research, uploads, and citation audit

Completed locally on September 27, 2026. **487 tests passed across 37 files, plus eight Chromium acceptance scenarios with zero page errors.** The audit found and fixed additional source-generation defects. It did not deploy or make live model-generation requests.

## Is the reported web-search regression fixed already?

Partly. The earlier fix that forwards the explicit topic through research and writing is present in the deployed ContentEngine. The deployed AIBackend and GeminiAPI modules match the local versions. Both public searches made during this audit returned HTTP 200 and three attributable results from the configured search Worker.

However, the current client deliberately accepts only a fixed list of public topics (plus narrowly defined public standards queries) on Canvas and non-Gemini search bridges. The free-text topic box did not explain that restriction. For example, `photosynthesis` passes; `How clouds form` is rejected by the client, even though the live search service can return results for it. Repeating generation could never resolve that policy rejection, but the UI reported a generic research failure after retries.

The new local fix checks this before document retrieval or model calls, preserves the existing source/reading, and explains how to recover. The source panel now offers **Supported web-search topics**, populated from the same policy used by the transport. Selecting an option explicitly changes the topic while retaining instructions and document selection. Native Gemini grounding continues to accept its existing topic inputs. The public-query policy was not relaxed.

The user's exact environment/topic was not supplied during this audit, so this is a reproduced failure mode, not a claim that it was necessarily their specific incident.

## Additional defects fixed

1. **A citation could become attached to the wrong section's source.** A first section with only one source could emit citation 2. After another section supplied a second source, the combined-document validation incorrectly accepted that citation and repaired its URL to the later source. Section-local citation numbers now pass range checks before receiving document-wide offsets. Regression cases cover complete, bare, truncated, missing-opening-marker, and zero-number citations.
2. **Malformed citations in later sections could point backward.** A second section's `[¹⁾]` marker missed the offset pass; later repair assigned it to the first section's source 1. The opening marker is now restored before renumbering. A failing-before/passing-after regression demonstrates the correction.
3. **Heading repair generated stray `#` lines.** Its regular expression treated the first `#` in an existing `##` heading as preceding prose. It now preserves heading markers. The multi-section generation tests check that no empty heading markers are published.

Two existing tests also needed source-location updates after earlier code extraction: rigor regeneration now lives in HostHandlers, and the Word Sounds disclosure lives in the sidebar source. Their original guard/accessibility assertions remain in force at the current locations. No production reader or upload code was changed for those test repairs.

## How the complete flow connects

| Stage | Verified behavior |
| --- | --- |
| Ordinary Upload Source File | The host captures the selected File before resetting the input, waits for the intake module, and ignores superseded upload work. Extraction publishes the original input and provenance. This entry point does not automatically add a document to the reusable research library. |
| Add documents / Use my own sources | The shared OwnSources helper parses and persists the local library, reports per-file failures, handles duplicate choices, and retains lesson-specific selection separately from stored documents. |
| Extraction | Tests cover supported text/Markdown, PDF, Word, PowerPoint, spreadsheets/CSV, and EPUB paths, including location metadata, unreadable/partial/scanned/encrypted inputs, and size limits. The browser acceptance uses a real TXT File through the actual parser and store. |
| Research | When enabled, usable web research completes before writing. Canvas/non-Gemini transports receive the explicit approved public topic, not the contextual prompt or uploaded passages. A missing/empty/unattributed research brief does not publish a replacement reading. |
| Document retrieval | Local retrieval uses the included documents, respects AI-use eligibility, bounds retrieval, and reports when selected documents were not usable. Relevant excerpts are sent to the selected model as labelled evidence; the original file bytes are parsed locally. |
| Drafting with documents | Document evidence remains distinct from web evidence. `[Your document N]` markers become passage anchors; web markers become links using their own source list. Ordinary drafting can add model prose; it is not an exact-excerpts guarantee. |
| Documents only | Web search is disabled. The model selects excerpts, and deterministic validation requires exact text from the supplied passages. Invalid/empty excerpts preserve the existing source instead of adding unsupported prose. Reading level, length, and tone do not rewrite these excerpts. |
| Publication | Existing original/adapted content remains during pending or failed generation. Usable output publishes once. Partial writing failures retain usable sections with explicit disclosure; missing sections do not contribute citation identities. |
| Citations and references | Web citation identity is validated before global numbering. Document citations retain source title/location/version and a saved passage snapshot, with exact appendices available in the output. Passage inspection works after reload while its snapshot remains stored. |
| Adaptation | The citation ledger protects web links and document anchors through adaptation and rigor regeneration. Tests reject dropped, reordered, duplicated, renumbered, and retargeted citations rather than silently assigning a new source. |

## Evidence and reproducibility

- `verification.json`: **457/457 tests in 35 suites**, with all 47 recorded input hashes unchanged during the run. Reproduce with `node reports/source-research-audit-2026-09-27/verify.cjs`.
- `intake-tests.json`: **30/30 additional tests in two suites** for startup file intake and upload cancellation/lifecycle. These are separate from the 457 above.
- `browser-results.json`: **8/8 acceptance scenarios**, four each at 1280px and 390px. Reproduce with `node reports/source-research-audit-2026-09-27/browser-flow.cjs`.
- Browser checks cover blocked-topic recovery, actual TXT import, mixed web/document generation, exact citation inspection, documents-only generation without search, persistence/reload, and absence of horizontal overflow. Screenshots `panel-390.png`, `panel-1280.png`, `citation-390.png`, and `citation-1280.png` were captured; the phone screenshots were visually reviewed.
- `live-checks.json`: timestamped public Worker responses and deployed/local SHA-256 comparisons. Only public synthetic topics were sent.
- `artifacts.json`: ContentEngine pin `75e23e37` and MiscPanels pin `88bc30fc`. Root/public/existing desktop-build runtime copies agree; the existing ContentEngine source mirror agrees; all three source hosts use the new pins. Module builds and scoped whitespace checks passed.

The jsdom run prints its existing unimplemented-canvas warning; no test fails, and the separate Chromium run has no page errors.

## Deployment state and limits

- The new fixes are **local and uncommitted**, with unrelated owner edits and concurrently staged work preserved. Nothing was pushed or deployed. The broader source-preservation fix and the newest OwnSources citation-cache changes also differ from the live CDN at the recorded check.
- Existing pasted Canvas hosts, deployed websites, and installed desktop packages need their respective release/update process before they receive these changes. Synchronizing local module mirrors is not a full application build or installer release.
- The live Worker accepted `How clouds form`, whereas the current checked-in Worker policy rejects it. This is observed deployment drift. The client policy still blocked the same topic before network access. Worker deployment was outside the authorized work performed here.
- Live search availability is verified, but live Gemini/OpenAI/Claude/local-model generation, every Canvas session, and semantic accuracy of real generated claims are not certified. Browser model replies and search transport are synthetic; this separates application correctness from model quality.
- A web citation identifies a supplied source; it does not by itself establish that the source supports every claim. Google exposes source chunks and claim-support mappings as separate fields in its [grounding documentation](https://ai.google.dev/gemini-api/docs/generate-content/google-search); the application retains that distinction.
- Document snapshot retention is bounded. The current helper preserves exact appendices, but automatic restoration of expired snapshots from exported appendices remains deferred by the existing citation-durability work.
- Four new UI/error keys have English runtime fallbacks. `ui-strings.delta.json` records them for localization without rewriting the concurrently edited translation catalogs. Public topic labels remain the transport's canonical English query labels.
