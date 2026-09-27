# Research phase regression: Gemini Canvas

User case: researching **water cycle** in **Gemini Canvas** appeared to jump directly to writing the reading. Prepared locally on 2026-09-26 against shared-workspace HEAD `fd4044c862ed9b345b340d69cb1411a19c09dafb`. No deployment, push, or commit was performed for this fix.

## Cause

The public-search policy accepts an exact approved topic such as `water cycle`. Source generation omitted the explicit topic argument, so the Canvas search bridge supplied the entire research prompt to that policy. The prompt was rejected. The content engine then caught research failures and silently continued to article generation. Local research similarly appended grade and instruction words to the query. Separately, the generation button displayed “Writing” throughout research.

The own-files setting does not itself disable web research. There was no separate teacher approval pause in the inspected source-generation flow; this fix restores the actual research phase and accurate progress, without adding a new review workflow.

## Changed behavior

- Initial research, section generation, dialogue generation, and citation retries pass the exact topic as the fifth `callGemini` argument.
- The host bridge and Claude/OpenAI-compatible provider paths carry that explicit query through to external search. Uploaded passages, grade instructions, and full model prompts do not become the web query.
- Local research searches the topic and requires usable web results before asking the model for a brief.
- Research must return a useful brief. Grounded provider research also requires at least one valid HTTP(S) source in its grounding metadata. Empty, incomplete, or ungrounded results are retried by the existing grounded-research retry loop.
- Exhausted research attempts stop generation with actionable retry guidance. Teachers can explicitly turn off Research with Web Search to draft without it.
- Research briefs retain facts under headings such as “Sources and key facts”; citation cleanup no longer strips that whole section.
- The generation button displays the current research/writing status and announces updates through a polite live region.
- The search-query contract gate no longer exempts the content engine.

The search allowlist and managed privacy restrictions remain enforced. Existing article-level citation cleanup and section fallback behavior remain intact.

## Files and ownership

Coordinator changes: `content_engine_source.jsx`, its generated module and desktop mirrors, `dev-tools/check_search_queries.cjs`, and the successful-research fixture in `tests/own_source_rag_and_citation_tokens.test.js`.

Provider subagent changes: `ai_backend_module.js`, its public mirror, and `tests/source_research_query_transport.test.js`.

Research regression subagent: `tests/source_research_phase.test.js`.

The **Fix document source research** chat added `generationStep` forwarding in `view_sidebar_panels_source.jsx` and the live progress label in `view_misc_panels_source.jsx`, then built their root/public modules. Its other document-source enhancements are separate work.

The **Establish release baseline ownership** chat added `searchQuery: _searchQuery || null` to the host bridge and synchronized the three host copies. Its broader reader/audio integration is separate work.

The workspace includes other sessions' changes, including pre-existing content-engine lookup changes. Do not attribute the entire working-tree diff to this fix or replace shared files with an older snapshot.

## Verification

**81 distinct focused tests passed across the final run and gate recheck.**

The combined run passed 80/81 tests. Its only failure was the repository-wide query scan taking about 6.8 seconds; the JSON reporter exposed only `STACK_TRACE_ERROR`. The same file passed all 7 tests on recheck with `--testTimeout=20000`, with the gate itself taking about 3.7 seconds. No product code changed between those runs. The direct query gate also passed: 20 grounded call sites supply a query or have an existing exemption.

Final focused files:

- `tests/source_research_phase.test.js` — 17 tests, including water cycle and photosynthesis through the real public-search policy with a Canvas-shaped bridge, phase ordering, visible progress, failures, and own-source independence.
- `tests/source_research_query_transport.test.js` — 19 tests, including the actual host bridge, provider routing, outbound query isolation, and privacy-policy rejection.
- `tests/source_citation_resilience.test.js`
- `tests/source_generation_state_ownership.test.js`
- `tests/own_source_rag_and_citation_tokens.test.js`
- `tests/external_search_privacy.test.js`
- `tests/search_query_contract.test.js`
- `tests/ai_backend_citation_followup.test.js`

Evidence: `final-tests.json`, `final-tests.log`, `query-gate-recheck.json`, and `query-gate-recheck.log` in this directory. Earlier narrower verification is saved as `core-tests.json` (27/27) and `research-tests.json` (58/58).

Focused whitespace checks passed. Content-engine source/module mirrors, provider mirrors, all three host copies, and both panel module mirror pairs matched at handoff. `_build_content_engine_module.js` rebuilt the engine; no broad deployment build ran.

These tests use controlled AI/search responses and do not constitute a live Gemini Canvas account check. After deployment, verify water cycle with Research with Web Search enabled: the status should show research first, successful research should precede writing, and an unavailable search should stop with retry guidance. Repeat with own-files use on and off.

A broader earlier test run also exposed an unrelated legacy Word Sounds host-markup expectation in `tests/source_generation_language.test.js`. The expected markup was already absent from HEAD. This fix does not claim the entire repository suite passes.

## Integration handoff

Content-engine/provider ownership for this regression is released after this handoff. Preserve the exact-topic fifth argument, host/provider query forwarding, research success gate, research-brief section preservation, and panel progress forwarding when applying subsequent changes. Rebuild only owned modules and synchronize their mirrors. Keep the broader integration/release approval process separate from this completed local fix.
