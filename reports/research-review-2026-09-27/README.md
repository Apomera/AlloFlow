# Reviewed research before source generation

Implemented locally on September 27, 2026. Enable **Review sources before writing** in Generate Source. The existing quick Generate flow remains the default.

## User flow

1. Enter a topic and choose web research and/or imported documents.
2. Find sources to review. Inspect the actual bounded passages available to the writer, including document locations and web links.
3. Include/exclude passages, remove them from this review, search another public topic, upload more documents and refresh passages, read a webpage excerpt, or paste additional text.
4. Generate from the included passages. No additional search runs during writing. The finished source includes references, evidence disclosures, passage snapshots and supplied/cited counts. Document citation links retain the existing exact-passage inspector and export appendix.

Search snippets, retrieved page excerpts, source-linked AI notes, document passages and pasted text are distinguished. Native Gemini grounding notes are labelled as model summaries, not verbatim page text. Link-only results cannot be selected. The activity panel records actual submitted queries, results, selection changes and failures; it does not purport to expose private model reasoning.

## Enforcement and recovery

- A frozen selection, containing only included evidence, is passed to the writer. Excluded passages, their titles and discovery summaries are not supplied. The writer uses JSON output with evidence IDs; the application creates all citation links from the approved collection. Unknown IDs, invented links, unreadable output and wholly uncited drafts fail without replacing the existing source or adaptation.
- Imported document permissions, lesson selection and versions are checked before writing. Missing document evidence is reported rather than treated as successful retrieval. Documents-only mode validates exact contiguous excerpts and excludes web evidence.
- Topic/selection changes, panel closure and cancelled discovery invalidate late results. Discovery and writing have bounded waits; a late response after a timeout cannot publish. Failures keep the current reading and review collection. Writing does not automatically retry with another evidence scope.
- Research holds at most 24 passages of 1,200 characters each; document retrieval retains the existing six-passage limit. The collection reports omitted results at capacity. Removing an item frees space without deleting the library document.
- The existing public-topic restriction, managed external-search policy and safe first-party webpage reader are reused. An unconfigured webpage reader reports its error; users can add a pasted passage. No new proxy, credential or deployment configuration was introduced.
- A standard references boundary precedes evidence appendices, keeping them outside the instructional prose used for source readability measurement and reference-aware adaptation.

## Validation

- `verification.json`: **501/501 tests across 39 suites**, covering the new review workflow and nearby source generation, uploads, citations, adaptation, privacy and webpage-reader paths. Recorded inputs did not change during testing. Reproduce: `node reports/research-review-2026-09-27/verify.cjs`.
- `browser-results.json`: **8/8 acceptance scenarios**, four each at 1280px and 390px. Uses the actual rebuilt panel, engine, document import, local storage, retrieval and citation inspector; only search transport, page fetch responses and model output are simulated. Reproduce: `node reports/research-review-2026-09-27/browser-flow.cjs`.
- Browser coverage: keyboard opt-in; additional searches retain exclusions; rejected queries retain evidence; real TXT upload and passage retrieval; URL/paste additions; activity and passage inspection; unknown citation failure preserves the reading; writing omits excluded evidence and performs no further search; exact document citation inspection after reload; no horizontal overflow or browser page errors. The phone review screenshot was visually inspected.
- `artifacts.json`: ContentEngine pin `607cdf6e`, MiscPanels pin `ad6fa052`; root/public/existing desktop-build module copies match. The existing ContentEngine source mirror and the two exact pins in all three source hosts are synchronized. Both module builders and scoped whitespace checks passed.

## Scope and remaining limits

This is a local implementation, not a deployment, installer rebuild or live-provider evaluation. Real model quality, availability and claim support still need normal provider evaluation; citations show attributed evidence and do not prove factual accuracy. Source text and quoted evidence must still be reviewed by the educator.

The editable review collection lasts while the source panel remains open. Successful generation stores selected evidence and activity in source provenance, and the output retains evidence appendices; resuming an unfinished review after closing or reloading is not implemented. The existing local citation snapshot cache is bounded; exported exact passages remain the fallback if cached snapshots expire.

New UI text has English fallbacks. `ui-strings.delta.json` contains 34 keys for localization without rewriting concurrently edited language catalogs. Evidence-type labels, action-log messages and report disclosures currently use English.

The scoped commit includes the related source/web-search/citation regression fixes from the preceding audit. Other owners' working files, module pins and staged changes are preserved. The shared `AGENT_HANDOFF.md` is updated locally without bundling other owners' notes. No push or deployment was requested or performed.
