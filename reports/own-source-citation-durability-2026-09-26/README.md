# Document research citation durability

Completed locally on 2026-09-26. This follow-up improves saved document citations and passage inspection after the previous research reliability release. It has not been committed, pushed or deployed.

## Changes

- Bounded citation retention: at most 200 records / 512 KiB in persistent storage and 64 records / 256 KiB in session memory. These are estimated serialized UTF-16 payload limits, not measured JavaScript heap limits.
- Storage-full recovery evicts eligible older citation copies and retries. Document libraries, lesson data and other storage namespaces are excluded. When storage is unavailable, bounded session copies remain available and persistence failure is reported accurately.
- Snapshot validation and conflicting-ID rejection prevent a retained citation from silently changing its quotation. Legacy snapshots remain readable. Batch protection, compare-before-removal and final readback reduce partial-save and concurrent-update problems.
- The citation dialog wraps long filenames and passages at phone widths. Its quotation region supports keyboard scrolling; Tab and Shift+Tab cycle within the dialog, Escape closes it, and focus returns to the citation.
- All four helper copies are synchronized. Only the OwnSources loader pin was changed by this follow-up in the three source hosts; concurrent changes to other loader pins were preserved.

Helper SHA256: `1c5dc26a858ecf69f0e44dc28e0198d770816a27d44c9fa6ddcecc21b06db96a`. OwnSources pin: `1c5dc26a`.

## Verification

**168/168 tests passed across ten files:** 57 integrated cache/inspector tests in `canonical-cache-inspector-tests.json` and 111 research regression tests in `research-regression-tests.json`. Regression coverage includes documents-only generation, evidence selection, citation adaptation, external-search privacy, imports, duplicates, selection and read recovery. Candidate-only runs are not counted again.

**Five Chromium scenarios passed with zero page errors**, recorded in `browser-citation-result.json`:

1. Long unbroken filenames and exact passages stay within a 390px viewport; source location and version remain visible.
2. Keyboard focus cycles correctly, PageDown scrolls the passage, Escape restores focus, and closing removes focus containment.
3. Injected quota failure recovers, the newest quotation reopens after reload, and unrelated storage survives.
4. After 220 saves, retention stays within budget (178 records / 523,088 estimated bytes); the newest quotation survives reload.
5. Total storage refusal preserves bounded in-session evidence and the exact output appendix; reload shows an accurate unavailable-snapshot message.

Final screenshots were visually checked. The browser harness uses the actual shipped helper and stylesheet on an isolated origin, real localStorage and injected storage failures. Syntax and scoped whitespace checks passed. `verification-summary.json` records final hashes, pin checks and test totals.

## Remaining limits

Cached copies may be evicted or lost when browser storage is cleared. Exact source appendices remain readable, but automatic restoration from exported appendices is deferred until reader and comparison surfaces can identify the correct saved source. A cache ID is protected against conflicts while its prior snapshot remains available; this is not a permanent ID registry.

LocalStorage cannot provide an atomic transaction across tabs. Comparison checks reduce races but cannot prevent a change immediately after verification. Quota recovery can remove an older cached copy before a later write fails. No original document or source appendix is removed by this cache.

No full-host build, live AI/provider request, end-to-end web research session or deployment was performed for this follow-up. Existing Gemini Canvas copies and deployed sites will not receive these new changes until their next authorized update.
