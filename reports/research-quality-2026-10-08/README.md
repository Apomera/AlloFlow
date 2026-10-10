# Research Quality Follow-Up

Local implementation snapshot: 2026-10-08. No commit, push, or deployment.

## Changes

- Review passes the selected topic to source grouping. Bounded lexical matching ranks relevant passages and prefers retrieved page/document text over snippets or source-linked AI notes on ties. This is a relevance heuristic, not a factual confidence score.
- Source cards show extractive highlights linked to the exact supporting passage. Links expand the passage list and focus the cited blockquote without another search or model call. Snippet-only and AI-note-only sources have visible warnings. Reading a page clears its stale unread-page warning while retaining the original snippet and passage IDs.
- Passage selection preserves exact wording and offsets. Conservative duplicate detection keeps changed words, word order, numbers, symbols, and negations distinct. Clipping avoids splitting surrogate pairs.
- Reviewed synthesis requires valid evidence IDs for every nonempty paragraph and rejects malformed or oversized structures. Exact quotes are checked against the frozen evidence. Multiple passages from one canonical webpage share a reference entry without losing their passage IDs.
- Citation coverage reports paragraph attribution, not semantic entailment or independent factual verification. Failed reviewed drafts leave original and adapted readings intact and do not retry automatically.
- The main research controls, ordinary one-click web path, and private-context query protections are unchanged. This pass adds no external query or model call.

## Verification

- The final engine tests passed all 78 assertions: existing review 42, relevance 16, and citation checks 20. See `focused-tests.json`.
- Review/settings UI passed 21 assertions in `ui-tests-unsandboxed.json`. A later combined run passed 97 of 99 assertions, with two UI cases exceeding the default five-second timeout. Its engine assertions all passed.
- The final settings rerun passed all 8 assertions in `ui-tests-final.json`, and the final review rerun passed all 13 in `review-ui-tests-current.json`, including the stale-warning regression assertion. Together with the 78 engine checks, all 99 unique focused tests passed across these runs. Earlier review-only retries hit worker-start timeouts before any assertions, with both fork and thread workers; those failed attempts remain recorded and are not counted as passes.
- The original sandbox UI run failed before assertions with a Windows temporary-cache EPERM error. Focused checks were subsequently run outside the sandbox.
- All 9 final Chromium browser scenarios passed against the built modules: ordinary web research, stronger source highlights and exact links, exclusions and reference deduplication, AI-note warnings, partly uncited draft rejection, combined document/web writing, and 1280px/390px/320px layout and keyboard behavior. `browser-results.json` records the exact module hashes, no page errors, and no external requests. Earlier harness-selector and navigation-timing failures were corrected before this final run.
- Desktop and both phone screenshots were visually inspected: source text and controls fit without horizontal overflow. The fixture uses synthetic search, page text, and model responses, not live providers. The latest local preview URL and PID are in `preview.json`.
- Scoped `git diff --check` passed, with only the existing handoff line-ending warning.

## Artifacts

`sync.cjs` updates only the ContentEngine and MiscPanels module families, existing runtime/source mirrors, their two loader pins in all three hosts, and the four new English research keys. `node reports/research-quality-2026-10-08/sync.cjs --check` verified parity. Exact hashes are in `artifacts.json`.

- ContentEngine pin: `3b4a8e37`.
- MiscPanels pin: `224419cd`.
- English strings are in root/public catalogs; the four-key localization delta is `ui-strings.delta.json`.

## Limits

No live search-provider or model-quality evaluation, full production host build, deployment, or assistive-technology session was performed. Lexical relevance can miss synonyms and semantic relationships. Citations can be structurally valid while a generated claim is unsupported; source review remains necessary. Other owners' changes in the shared checkout were preserved.
