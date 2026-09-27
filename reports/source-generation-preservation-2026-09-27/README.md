# Preserve existing work during source generation

Starting another source-generation attempt no longer clears the existing adapted reading or replaces its source with a title placeholder. The engine keeps research and section drafts local until a usable result is ready. A research failure, total writing failure, empty reply, metadata-only JSON or citation-only reply preserves the current source, adapted reading and view. Failure does not restore an old snapshot over newer teacher edits.

Useful partial results remain available when another section fails. Skipped sections contribute neither source links nor grounding counters, and subsequent prompts retain the original section numbers and titles. The warning reports missing sections without inventing a rate-limit cause. Dialogue rejects empty metadata, retains readable plain-text fallback, and tolerates malformed optional fields without publishing object values. Documents-only generation continues to require exact supported excerpts.

The source is published once after generation and cleanup. With the existing `switchView=false` option, successful generation still preserves the current adapted reading and view. This is a publication boundary, not a new research approval screen or an in-flight cancellation feature.

## Scope and ownership

The initial local HEAD was `16e3ea214bea20953b79b0e86e41f6d0beef9deb`. Production changes are limited to `content_engine_source.jsx`, its exact `desktop/web-app/src/` source mirror, generated `content_engine_module.js`, its public mirror, and the exact ContentEngine cache pin in the three source hosts. Existing ignored desktop build copies were synchronized as well. The focused builder, `_build_content_engine_module.js`, syntax-checks the module; no full host build or installer was run. The normal commit hook caught the initially missed source mirror; after confirming that mirror had no other edits, only that pair was synchronized.

Three test files are owned by this pass: the new `tests/source_generation_preservation.test.js`, the existing engine-instance publication assertions, and the static partial-failure warning contract. Other reader, bilingual candidate, research-document, simulator, localization and host changes remain with their owners. Shared `AGENT_HANDOFF.md` remains unstaged.

`content-engine-pins.patch` records exactly the three applied pin hunks. `pin-inputs.json` records each host's pre-edit hash; reversing only the new pin reproduced that hash immediately after applying it. These are the only host hunks included in this pass's commit.

## Verification

- The initial 25-case preservation suite against immutable HEAD reproduced 21 failures (four passing). See `baseline-summary.json` and `baseline.json`.
- The expanded 40-case preservation suite passes against current source. It covers remote/local research failures, pending generation, total failure, partial success, intervening edits, malformed provider values, own-file evidence, dialogue and short Chinese text. See `current-summary.json` and `current-preservation.json`.
- The final combined run passed **137/137 tests in eight files**. All 22 recorded inputs stayed unchanged during that run. `final-regression.json` and `validation-summary.json` include research query transport, citation resilience, document-only excerpt generation, header handling and engine-instance ownership.
- The first existing-suite run passed 67/68 checks; its single static assertion required the obsolete rate-limit-specific warning. That assertion was updated to the new neutral keyed warning. The next run passed 68/68.
- The focused toast ratchet passed without changing its baseline. Runtime/source and mirror parity, pin consistency and scoped whitespace are checked separately.

Before commit, the owned source/module copies were normalized from mixed CRLF to LF as required by `.gitattributes`. `committed-artifacts.json` records this line-ending-only conversion and confirms exact source-to-wrapper equality and syntax. The final ContentEngine pin is `60e5be9c`; it matches all four normalized module copies. `final-artifact-check.json` repeats preservation and generated-module ownership checks on those exact commit bytes.

Reproduce the combined suite from the repository root:

```powershell
node _build_content_engine_module.js
node node_modules/vitest/vitest.mjs run tests/source_generation_preservation.test.js tests/source_generation_state_ownership.test.js tests/source_research_phase.test.js tests/source_citation_resilience.test.js tests/document_builder_quickwins.test.js tests/content_engine_headers.test.js tests/source_research_query_transport.test.js tests/own_source_rag_and_citation_tokens.test.js --maxWorkers=1
```

The tests use controlled providers and real source/generated engine code. This pass did not call live AI, test a live Gemini Canvas copy, run full CI, push, deploy, or publish an installer. The prior release's global CI limitations are not closed by these focused results.

## Translation and follow-up handoffs

`catalog-handoff.json` contains the two exact keys and English values sent to the active localization owner. Both call sites have safe English fallback when the translator returns a missing key, blank value or throws. This pass does not overwrite shared catalogs or claim the owner's isolated translations are integrated.

The audit also identified separate follow-ups: Review word help can be inert from Both/Edit when its teacher panel is absent; collapsing the review panel can hide pending/error feedback; Storybook portfolio save can claim durable success after storage failure. These source-backed findings were not implemented or runtime-verified in this pass because their files belong to different lanes. An explicit teacher research/source approval checkpoint remains a distinct workflow enhancement; existing source generation automatically proceeds from valid research to writing.
