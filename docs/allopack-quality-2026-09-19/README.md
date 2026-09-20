# AlloPack formatting and quality review — 2026-09-19

> Native goal follow-up: [supported progress goals and compatible activity targets](NATIVE-GOAL-COMPATIBILITY.md).

> Generation follow-up: [answerability, activity references, and complete answer auditing](ANSWER-REFERENCE-SAFEGUARDS.md).

> Body Systems follow-up: [aligned editions, accessible investigation, and evidence limits](BODY-SYSTEMS-QUALITY.md).

> Request-flow follow-up: [validated downloads, honest import feedback, and retry](CATALOG-REQUEST-RELIABILITY.md).

> Catalog usability follow-up: [search, grade filtering, and keyboard recovery](CATALOG-DISCOVERY.md).

> Latest catalog follow-up: [capability tags and resilient edition validation](CATALOG-CAPABILITIES.md).

> Water Cycle follow-up completed: [completion and edition-consistency results](WATER-CYCLE-COMPLETION.md). The missing activities noted below are now integrated locally.

> Follow-up completed: [Refinement results](REFINEMENT-RESULTS.md). This page preserves the original findings; consult the follow-up for current status.

This pass inspected 62 original pack files and 43 illustrated editions (105 files, 1,245 resources). It repaired confirmed authoring/export defects and reviewed catalog structure, image/alt-text presence, and automated quality signals. It did not publish changes, inspect the signed-in live community library, visually recheck every image, or verify every factual claim and standards alignment.

## Confirmed defects repaired

1. **Written responses rendered as empty multiple-choice questions.** Catalog packs use `shortAnswer`, while the shared HTML/worksheet exporter recognized `short-answer`. The exporter now accepts both. Student response space and teacher expected answers are preserved. All 105 files contain the affected spelling: 198 questions in total.
2. **Numeric answer text could select the wrong option.** The exporter interpreted numeric strings and single letters as legacy option indices before matching the actual option text. It now prefers an exact option-text match. Real examples: Linear Equations has answer `2` in option 0, but the old exporter selected option 2; Making Ten has answer `3` in option 0, but selected option 3. Both original and illustrated editions are affected. Legacy indices/letters still work when no exact text matches.
3. **Malformed draft data could crash validation or survive until rendering.** The text-draft service now handles non-array history and null questions without throwing; rejects object metadata rather than turning it into `[object Object]`; checks nested chart bullets, outline items, sort labels/IDs, timeline fields, sentence frames, math explanations, Cornell cue text, and MCQ choices. Markdown content remains unchanged. Native reflection aliases and both short-answer spellings remain compatible.
4. **Printable MCP input accepted malformed resource envelopes.** Added nonempty ID/type/title, unique IDs, required data, and string metadata checks before browser work. UTF-8 BOM-prefixed JSON is accepted. The tool description explains that this endpoint expects `items`, not the `.allopack.json` `history` envelope.
5. **Audit coverage and import QA were incomplete.** The quality audit now includes illustrated editions by default. Completed illustrated packs no longer receive a missing-shot-list warning merely because their planning companion is absent. Answer-integrity tests include illustrated editions. The import harness now calls the actual host-handler factory rather than evaluating an obsolete wrapper from the monolithic app source. The text-draft module is included in mirror parity checks.

## Remaining generation/integration risks

- **The two MCP tools have different jobs.** `resource_pack_generate` finalizes caller-authored text drafts; it does not call an image/text model. `generate_resource_pack` exports native resources through the production HTML renderer. For the latter, explicitly map `pack.history` to `items` and `pack.sourceTopic` to `topic`; preserve resource data and IDs. It produces HTML, not an importable AlloPack or a community-library publication.
- **The text-draft validator is not the catalog import validator.** All 105 existing files contain at least one resource type outside its 12-type subset. All 43 illustrated editions also contain embedded images, which it deliberately rejects. Its 500,000-character pack limit and 120,000-character item limit exclude many image-rich files. Tool descriptions now state this limitation. Keep the draft restrictions until a separate, explicit catalog-editing/asset contract exists; do not remove the limits just to force imports through.
- **Normalization is not lossless editing.** The draft composer reconstructs its envelope and each resource from a whitelist; top-level resource fields such as `imageSlot` are not retained. Never use this path to round-trip an existing pack. A future editing endpoint should preserve supported metadata and reject unsupported changes explicitly.
- **Requested resources are not programmatically reconciled with provider output.** The provider-backed service asks for every planned resource in order, but currently validates the resulting pack without comparing its final type/count/order to the request. Add a plan-completeness check so a valid-looking partial pack cannot silently succeed.
- **Nested validation is still partial.** Unknown quiz types and some optional native fields do not yet have complete per-type contracts. Prefer shared renderer schemas, with explicit versioning, over additional independent prompt-only conventions.
- **Verification labels need provenance.** `dev-tools/build_five_text_allopacks.cjs` sets memory-card and challenge `factVerified: true` automatically while the envelope says educator review is pending. These labels do not prove teacher or source review. Future builds should require an explicit review record before setting them. Review existing flags against actual evidence rather than clearing or trusting every flag in bulk.
- One illustrated pack (Making Ten) triggers the draft privacy heuristic. This is diagnostic only: that validator scans serialized payloads, including image bytes. Inspect the trigger and separate binary asset data from text scanning before treating it as evidence of personal information.

## Current quality findings

The combined heuristic audit flags **25 illustrated editions, with 88 review signals**. The 62 originals have no flags under this heuristic; that is not a factual or pedagogical clearance. Estimated reading levels are approximate, especially for short passages, technical vocabulary, and non-reading resources. Answer-position imbalance in a short quiz is likewise a review cue, not an automatic defect.

| Priority | Concrete examples | Improvement |
| --- | --- | --- |
| Reading demand | Figurative Language grade 5: reading estimate 9.0; Plate Tectonics grade 6: 10.1; Word Families grade 1: 3.9; Story Retell grade 2: 4.3 | Review student-facing wording, especially FAQ/glossary and mnemonic scaffolds. Shorten syntax while preserving essential vocabulary and concepts. |
| Source/edition drift | The original Argument and Evidence outline still describes a claim as “Not a fact (checkable, undisputed)”; the illustrated revision uses a different explanation. | Reconcile conceptual explanations across editions. A claim can be factual and can be checked; facts and claims should not be taught as mutually exclusive categories. |
| Stale metadata | Eight illustrated readings have word-count labels differing substantially from the audit count. For example, Linear Equations claims about 510 words versus 380 counted. | Derive counts from the final exported reading, or remove hand-maintained counts. Check intended tokenization before adopting a canonical count. |
| Assessment clues | Argument and Evidence, Central Idea, and Theme Development each have four items with a potential option-length clue. | Review plausibility and comparable specificity of distractors; avoid making the correct choice consistently longest. Keep meaning ahead of artificial answer-position balance. |
| Vocabulary support | Body Systems, Moon Phases, Photosynthesis, and Plate Tectonics have no exact glossary-term bold matches in the reading. | Add selective emphasis or links where the actual concept is introduced; review inflections and synonyms before treating every missing exact match as an omission. |
| Sorting depth | Cell Structure has a category with one card. | Check whether the activity needs another contrasting example and an explanation prompt, or whether the imbalance is intentional. |
| Repetitive scaffolds | The pack builder reuses generic frames and challenge supports across lessons. | Replace generic prompts with grade-appropriate, lesson-specific observations, examples, and transfer tasks. |

## Image and accessibility coverage

All 43 illustrated editions have images in every inspected glossary, anchor-chart section, and concept-sort card slot: **444 glossary placements, 187 chart placements, and 394 sort placements**. Across the whole catalog there are **1,404 embedded image placements**, all with nonempty associated alt text (no unidentified embedded-image field shapes). Reused images count as multiple placements.

This confirms presence, not that each illustration or description is accurate, concise, instructionally useful, or free of baked-in text. The next visual review should compare each image with its lesson claim and alt text, prioritizing concept explanations over generic student scenes and preserving app-native labels. The 62 original editions are not expected to have the same image coverage as the 43 illustrated editions.

## Verification and evidence

- Production offline JSON bridge/import: **105/105 files, 1,245 resources passed**, with original resource fields preserved. See `imports.json`.
- Validator, print regressions, answer-integrity, and build-parity run: **446 tests passed** before adding two real catalog numeric-answer examples. The final print-only rerun passed all eight cases, including the two catalog examples. Its timeout was increased to 30 seconds after a busy-host run exceeded the default five seconds.
- Final validator rerun after malformed ID/type hardening: **21 tests passed**.
- Focused real-stdio MCP run: **7 passed, 70 unrelated tests deselected**, including required initialization, BOM-prefixed input validation, and direct production HTML parity. The first filtered attempt omitted initialization and failed; the corrected invocation passed.
- Broader existing export/catalog run: **388 passed, 2 failed**. Both failures expect Applied Challenge feedback text “Fact check needed.” The current output instead identifies older feedback as requiring review. Repeating those two cases with the committed renderer and current dependencies reproduced both failures; they are not caused by the quiz changes. Reconcile the test expectation with the intended feedback-status contract separately.
- Agent-core mirror check: four mirrored modules matched. Canonical doc-pipeline build and build-parity tests passed at verification time. Other tasks are concurrently editing this checkout; rerun relevant checks before committing a combined change.
- No model calls, new image generation, commit, or deployment were performed for this review.

Reproduce the main audits from the repository root:

```text
node dev-tools/qa_allopack_imports.cjs 2026-09-19
node dev-tools/audit_allopacks.cjs --json
node dev-tools/audit_allopack_image_coverage.cjs 2026-09-19
node dev-tools/check_agent_core_mirrors.cjs
```

Machine-readable evidence: `imports.json`, `quality-audit.json`, and `image-and-draft-coverage.json` in this folder. Prioritize the confirmed exporter fixes for integration, then reconcile original/illustrated content and simplify the highest-demand student materials. Treat semantic review and live-library verification as separate remaining work.
